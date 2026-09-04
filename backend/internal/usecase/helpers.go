package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/models"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
)

// memberRole returns callerID's role on teamID, or ErrForbidden if they are not
// a member. Callers that need to tell the client what the caller may do should
// use this rather than requireMember — the role is already loaded, so returning
// it costs no extra query.
func memberRole(ctx context.Context, repo domains.TeamRepository, teamID, callerID uuid.UUID) (string, error) {
	res, err := repo.GetMembership(ctx, domains.GetMembershipRequest{
		TeamID: teamID,
		UserID: callerID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		return "", ErrForbidden
	}
	if err != nil {
		return "", fmt.Errorf("check membership: %w", err)
	}
	return res.Member.Role, nil
}

// requireMember returns ErrForbidden if callerID is not a member of teamID.
func requireMember(ctx context.Context, repo domains.TeamRepository, teamID, callerID uuid.UUID) error {
	_, err := memberRole(ctx, repo, teamID, callerID)
	return err
}

// requireCoach returns ErrForbidden unless callerID holds the coach role on teamID.
func requireCoach(ctx context.Context, repo domains.TeamRepository, teamID, callerID uuid.UUID) error {
	role, err := memberRole(ctx, repo, teamID, callerID)
	if err != nil {
		return err
	}
	if role != models.RoleCoach {
		return ErrForbidden
	}
	return nil
}
