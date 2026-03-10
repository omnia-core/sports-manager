package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
)

// playbookUsecase is the concrete implementation of domains.PlaybookUsecase.
type playbookUsecase struct {
	repo     domains.PlaybookRepository
	teamRepo domains.TeamRepository
}

// NewPlaybookUsecase constructs a PlaybookUsecase.
func NewPlaybookUsecase(repo domains.PlaybookRepository, teamRepo domains.TeamRepository) domains.PlaybookUsecase {
	return &playbookUsecase{repo: repo, teamRepo: teamRepo}
}

// ----------------------------------------------------------------------------
// Playbook operations
// ----------------------------------------------------------------------------

// CreatePlaybook validates inputs, checks the caller is a coach on the team,
// then creates the playbook.
func (u *playbookUsecase) CreatePlaybook(ctx context.Context, req domains.CreatePlaybookRequest) (domains.CreatePlaybookResponse, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return domains.CreatePlaybookResponse{}, ErrNameRequired
	}

	if err := requireCoach(ctx, u.teamRepo, req.TeamID, req.CallerID); err != nil {
		return domains.CreatePlaybookResponse{}, err
	}

	res, err := u.repo.CreatePlaybook(ctx, req)
	if err != nil {
		return domains.CreatePlaybookResponse{}, fmt.Errorf("create playbook: %w", err)
	}
	return res, nil
}

// GetPlaybook verifies the caller is a member of the playbook's team, then
// returns the playbook.
func (u *playbookUsecase) GetPlaybook(ctx context.Context, req domains.GetPlaybookRequest) (domains.GetPlaybookResponse, error) {
	pbRes, err := u.repo.GetPlaybook(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.GetPlaybookResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.GetPlaybookResponse{}, fmt.Errorf("get playbook: %w", err)
	}

	if err := requireMember(ctx, u.teamRepo, pbRes.Playbook.TeamID, req.CallerID); err != nil {
		return domains.GetPlaybookResponse{}, err
	}

	return pbRes, nil
}

// ListPlaybooks verifies the caller is a member of the team, then returns all
// playbooks for that team.
func (u *playbookUsecase) ListPlaybooks(ctx context.Context, req domains.ListPlaybooksRequest) (domains.ListPlaybooksResponse, error) {
	if err := requireMember(ctx, u.teamRepo, req.TeamID, req.CallerID); err != nil {
		return domains.ListPlaybooksResponse{}, err
	}

	res, err := u.repo.ListPlaybooks(ctx, req)
	if err != nil {
		return domains.ListPlaybooksResponse{}, fmt.Errorf("list playbooks: %w", err)
	}
	return res, nil
}

// UpdatePlaybook verifies the caller is a coach on the playbook's team, then
// applies the updates.
func (u *playbookUsecase) UpdatePlaybook(ctx context.Context, req domains.UpdatePlaybookRequest) (domains.UpdatePlaybookResponse, error) {
	teamID, err := u.teamIDForPlaybook(ctx, req.PlaybookID)
	if err != nil {
		return domains.UpdatePlaybookResponse{}, err
	}

	if err := requireCoach(ctx, u.teamRepo, teamID, req.CallerID); err != nil {
		return domains.UpdatePlaybookResponse{}, err
	}

	res, err := u.repo.UpdatePlaybook(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.UpdatePlaybookResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.UpdatePlaybookResponse{}, fmt.Errorf("update playbook: %w", err)
	}
	return res, nil
}

// DeletePlaybook verifies the caller is a coach on the playbook's team, then
// deletes the playbook (cascade removes its plays).
func (u *playbookUsecase) DeletePlaybook(ctx context.Context, req domains.DeletePlaybookRequest) (domains.DeletePlaybookResponse, error) {
	teamID, err := u.teamIDForPlaybook(ctx, req.PlaybookID)
	if err != nil {
		return domains.DeletePlaybookResponse{}, err
	}

	if err := requireCoach(ctx, u.teamRepo, teamID, req.CallerID); err != nil {
		return domains.DeletePlaybookResponse{}, err
	}

	res, err := u.repo.DeletePlaybook(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.DeletePlaybookResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.DeletePlaybookResponse{}, fmt.Errorf("delete playbook: %w", err)
	}
	return res, nil
}

// ----------------------------------------------------------------------------
// Play operations
// ----------------------------------------------------------------------------

// CreatePlay validates inputs, checks the caller is a coach on the playbook's
// team, then creates the play.
func (u *playbookUsecase) CreatePlay(ctx context.Context, req domains.CreatePlayRequest) (domains.CreatePlayResponse, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return domains.CreatePlayResponse{}, ErrNameRequired
	}
	if req.Category == "" {
		req.Category = "offense"
	}

	teamID, err := u.teamIDForPlaybook(ctx, req.PlaybookID)
	if err != nil {
		return domains.CreatePlayResponse{}, err
	}

	if err := requireCoach(ctx, u.teamRepo, teamID, req.CallerID); err != nil {
		return domains.CreatePlayResponse{}, err
	}

	res, err := u.repo.CreatePlay(ctx, req)
	if err != nil {
		return domains.CreatePlayResponse{}, fmt.Errorf("create play: %w", err)
	}
	return res, nil
}

// GetPlay looks up the play, walks up to the playbook to get the team, checks
// membership, then returns the play.
func (u *playbookUsecase) GetPlay(ctx context.Context, req domains.GetPlayRequest) (domains.GetPlayResponse, error) {
	playRes, err := u.repo.GetPlay(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.GetPlayResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.GetPlayResponse{}, fmt.Errorf("get play: %w", err)
	}

	teamID, err := u.teamIDForPlaybook(ctx, playRes.Play.PlaybookID)
	if err != nil {
		return domains.GetPlayResponse{}, err
	}

	if err := requireMember(ctx, u.teamRepo, teamID, req.CallerID); err != nil {
		return domains.GetPlayResponse{}, err
	}

	return playRes, nil
}

// ListPlays verifies the caller is a member of the playbook's team, then
// returns all plays for that playbook.
func (u *playbookUsecase) ListPlays(ctx context.Context, req domains.ListPlaysRequest) (domains.ListPlaysResponse, error) {
	teamID, err := u.teamIDForPlaybook(ctx, req.PlaybookID)
	if err != nil {
		return domains.ListPlaysResponse{}, err
	}

	if err := requireMember(ctx, u.teamRepo, teamID, req.CallerID); err != nil {
		return domains.ListPlaysResponse{}, err
	}

	res, err := u.repo.ListPlays(ctx, req)
	if err != nil {
		return domains.ListPlaysResponse{}, fmt.Errorf("list plays: %w", err)
	}
	return res, nil
}

// UpdatePlay looks up the play → playbook → team, checks the caller is a
// coach, then applies the updates.
func (u *playbookUsecase) UpdatePlay(ctx context.Context, req domains.UpdatePlayRequest) (domains.UpdatePlayResponse, error) {
	playRes, err := u.repo.GetPlay(ctx, domains.GetPlayRequest{PlayID: req.PlayID, CallerID: req.CallerID})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.UpdatePlayResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.UpdatePlayResponse{}, fmt.Errorf("get play for update: %w", err)
	}

	teamID, err := u.teamIDForPlaybook(ctx, playRes.Play.PlaybookID)
	if err != nil {
		return domains.UpdatePlayResponse{}, err
	}

	if err := requireCoach(ctx, u.teamRepo, teamID, req.CallerID); err != nil {
		return domains.UpdatePlayResponse{}, err
	}

	res, err := u.repo.UpdatePlay(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.UpdatePlayResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.UpdatePlayResponse{}, fmt.Errorf("update play: %w", err)
	}
	return res, nil
}

// DeletePlay looks up the play → playbook → team, checks the caller is a
// coach, then deletes the play.
func (u *playbookUsecase) DeletePlay(ctx context.Context, req domains.DeletePlayRequest) (domains.DeletePlayResponse, error) {
	playRes, err := u.repo.GetPlay(ctx, domains.GetPlayRequest{PlayID: req.PlayID, CallerID: req.CallerID})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.DeletePlayResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.DeletePlayResponse{}, fmt.Errorf("get play for delete: %w", err)
	}

	teamID, err := u.teamIDForPlaybook(ctx, playRes.Play.PlaybookID)
	if err != nil {
		return domains.DeletePlayResponse{}, err
	}

	if err := requireCoach(ctx, u.teamRepo, teamID, req.CallerID); err != nil {
		return domains.DeletePlayResponse{}, err
	}

	res, err := u.repo.DeletePlay(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.DeletePlayResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.DeletePlayResponse{}, fmt.Errorf("delete play: %w", err)
	}
	return res, nil
}

// ----------------------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------------------

// teamIDForPlaybook fetches the playbook and returns its TeamID.
// Returns ErrNotFound (unwrapped) if the playbook does not exist.
func (u *playbookUsecase) teamIDForPlaybook(ctx context.Context, playbookID uuid.UUID) (uuid.UUID, error) {
	pbRes, err := u.repo.GetPlaybook(ctx, domains.GetPlaybookRequest{PlaybookID: playbookID})
	if errors.Is(err, repository.ErrNotFound) {
		return uuid.Nil, repository.ErrNotFound
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("look up playbook: %w", err)
	}
	return pbRes.Playbook.TeamID, nil
}
