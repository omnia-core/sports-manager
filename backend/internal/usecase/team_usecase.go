package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
)

// ErrForbidden is returned when the caller lacks the required role.
var ErrForbidden = errors.New("forbidden")

// ErrNameRequired is returned when a required name field is empty.
var ErrNameRequired = errors.New("name is required")

// ErrAlreadyMember is returned when the user is already a member of the team.
var ErrAlreadyMember = errors.New("user is already a member of this team")

// teamUsecase is the concrete implementation of domains.TeamUsecase.
type teamUsecase struct {
	repo domains.TeamRepository
}

// NewTeamUsecase constructs a TeamUsecase.
func NewTeamUsecase(repo domains.TeamRepository) domains.TeamUsecase {
	return &teamUsecase{repo: repo}
}

// CreateTeam validates inputs, then creates the team and adds the creator as
// coach in a single repository-level transaction.
func (u *teamUsecase) CreateTeam(ctx context.Context, req domains.CreateTeamRequest) (domains.CreateTeamResponse, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return domains.CreateTeamResponse{}, ErrNameRequired
	}
	if req.Sport == "" {
		req.Sport = "basketball"
	}

	res, err := u.repo.CreateTeam(ctx, req)
	if err != nil {
		return domains.CreateTeamResponse{}, fmt.Errorf("create team: %w", err)
	}
	return res, nil
}

// GetTeam verifies the caller is a team member before returning the team.
func (u *teamUsecase) GetTeam(ctx context.Context, req domains.GetTeamRequest) (domains.GetTeamResponse, error) {
	if err := requireMember(ctx, u.repo, req.TeamID, req.CallerID); err != nil {
		return domains.GetTeamResponse{}, err
	}

	res, err := u.repo.GetTeam(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.GetTeamResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.GetTeamResponse{}, fmt.Errorf("get team: %w", err)
	}
	return res, nil
}

// ListTeams returns all teams the caller belongs to.
func (u *teamUsecase) ListTeams(ctx context.Context, req domains.ListTeamsRequest) (domains.ListTeamsResponse, error) {
	res, err := u.repo.ListTeams(ctx, req)
	if err != nil {
		return domains.ListTeamsResponse{}, fmt.Errorf("list teams: %w", err)
	}
	return res, nil
}

// UpdateTeam verifies the caller is a coach on this team before applying updates.
func (u *teamUsecase) UpdateTeam(ctx context.Context, req domains.UpdateTeamRequest) (domains.UpdateTeamResponse, error) {
	if err := requireCoach(ctx, u.repo, req.TeamID, req.CallerID); err != nil {
		return domains.UpdateTeamResponse{}, err
	}

	res, err := u.repo.UpdateTeam(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.UpdateTeamResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.UpdateTeamResponse{}, fmt.Errorf("update team: %w", err)
	}
	return res, nil
}

// DeleteTeam verifies the caller is a coach on this team before deleting it.
func (u *teamUsecase) DeleteTeam(ctx context.Context, req domains.DeleteTeamRequest) (domains.DeleteTeamResponse, error) {
	if err := requireCoach(ctx, u.repo, req.TeamID, req.CallerID); err != nil {
		return domains.DeleteTeamResponse{}, err
	}

	res, err := u.repo.DeleteTeam(ctx, req)
	if errors.Is(err, repository.ErrNotFound) {
		return domains.DeleteTeamResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.DeleteTeamResponse{}, fmt.Errorf("delete team: %w", err)
	}
	return res, nil
}

// ListMembers verifies the caller is a team member, then returns the full roster.
func (u *teamUsecase) ListMembers(ctx context.Context, req domains.ListMembersRequest) (domains.ListMembersResponse, error) {
	if err := requireMember(ctx, u.repo, req.TeamID, req.CallerID); err != nil {
		return domains.ListMembersResponse{}, err
	}

	res, err := u.repo.ListMembers(ctx, req)
	if err != nil {
		return domains.ListMembersResponse{}, fmt.Errorf("list members: %w", err)
	}
	return res, nil
}
