package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/mailer"
	"github.com/omnia-core/sports-manager/backend/internal/models"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
)

// ErrInviteAlreadyPending is returned when a pending invite already exists for
// the given team + email combination.
var ErrInviteAlreadyPending = errors.New("invite already pending for this email")

// ErrInviteInvalid is returned when a token does not correspond to a valid,
// pending, non-expired invite.
var ErrInviteInvalid = errors.New("invite is invalid or has expired")

// inviteUsecase is the concrete implementation of domains.InviteUsecase.
type inviteUsecase struct {
	inviteRepo domains.InviteRepository
	teamRepo   domains.TeamRepository
	mailer     mailer.Sender
}

// NewInviteUsecase constructs an InviteUsecase with all required dependencies.
func NewInviteUsecase(
	inviteRepo domains.InviteRepository,
	teamRepo domains.TeamRepository,
	m mailer.Sender,
) domains.InviteUsecase {
	return &inviteUsecase{
		inviteRepo: inviteRepo,
		teamRepo:   teamRepo,
		mailer:     m,
	}
}

// CreateInvite verifies the caller is a coach on the team, guards against
// duplicate pending invites, persists the invite record, and sends the invite
// email. Email send failure is non-fatal — the invite is still created.
func (u *inviteUsecase) CreateInvite(ctx context.Context, req domains.CreateInviteRequest) (domains.CreateInviteResponse, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" {
		return domains.CreateInviteResponse{}, fmt.Errorf("email is required")
	}

	// Verify caller is coach on this team.
	memberRes, err := u.teamRepo.GetMembership(ctx, domains.GetMembershipRequest{
		TeamID: req.TeamID,
		UserID: req.CallerID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.CreateInviteResponse{}, ErrForbidden
	}
	if err != nil {
		return domains.CreateInviteResponse{}, fmt.Errorf("check membership: %w", err)
	}
	if memberRes.Member.Role != models.RoleCoach {
		return domains.CreateInviteResponse{}, ErrForbidden
	}

	// Guard against duplicate pending invites for the same team + email.
	existing, err := u.inviteRepo.GetInviteByTeamAndEmail(ctx, domains.GetInviteByTeamAndEmailRequest{
		TeamID: req.TeamID,
		Email:  req.Email,
	})
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return domains.CreateInviteResponse{}, fmt.Errorf("check existing invite: %w", err)
	}
	if err == nil && existing.Invite.Status == models.InviteStatusPending && existing.Invite.ExpiresAt.After(time.Now()) {
		return domains.CreateInviteResponse{}, ErrInviteAlreadyPending
	}

	// Resolve team name for the email body.
	teamRes, err := u.teamRepo.GetTeam(ctx, domains.GetTeamRequest{
		TeamID:   req.TeamID,
		CallerID: req.CallerID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.CreateInviteResponse{}, repository.ErrNotFound
	}
	if err != nil {
		return domains.CreateInviteResponse{}, fmt.Errorf("get team: %w", err)
	}

	// Persist invite — forward only the fields the repository needs.
	createRes, err := u.inviteRepo.CreateInvite(ctx, domains.CreateInviteRequest{
		TeamID: req.TeamID,
		Email:  req.Email,
	})
	if err != nil {
		return domains.CreateInviteResponse{}, fmt.Errorf("create invite: %w", err)
	}

	// Send email — non-fatal; log happens inside the mailer no-op path.
	_ = u.mailer.SendInvite(ctx, req.Email, teamRes.Team.Name, createRes.Invite.Token.String())

	return createRes, nil
}

// AcceptInvite looks up the invite by token, validates it is pending and
// unexpired, then atomically adds the user to team_members and marks the
// invite accepted.
func (u *inviteUsecase) AcceptInvite(ctx context.Context, req domains.AcceptInviteRequest) (domains.AcceptInviteResponse, error) {
	invRes, err := u.inviteRepo.GetInviteByToken(ctx, domains.GetInviteByTokenRequest{
		Token: req.Token,
	})
	if errors.Is(err, repository.ErrNotFound) {
		return domains.AcceptInviteResponse{}, ErrInviteInvalid
	}
	if err != nil {
		return domains.AcceptInviteResponse{}, fmt.Errorf("get invite: %w", err)
	}

	inv := invRes.Invite
	if inv.Status != models.InviteStatusPending || !inv.ExpiresAt.After(time.Now()) {
		return domains.AcceptInviteResponse{}, ErrInviteInvalid
	}

	atomicRes, err := u.inviteRepo.AcceptInviteAtomic(ctx, domains.AcceptInviteAtomicRequest{
		InviteID:  inv.ID,
		TeamID:    inv.TeamID,
		UserID:    req.UserID,
		ExpiresAt: inv.ExpiresAt,
	})
	if err != nil {
		if errors.Is(err, repository.ErrAlreadyMember) {
			return domains.AcceptInviteResponse{}, ErrAlreadyMember
		}
		if errors.Is(err, repository.ErrInviteExpiredInTx) {
			return domains.AcceptInviteResponse{}, ErrInviteInvalid
		}
		return domains.AcceptInviteResponse{}, fmt.Errorf("accept invite: %w", err)
	}

	return domains.AcceptInviteResponse{Member: atomicRes.Member}, nil
}
