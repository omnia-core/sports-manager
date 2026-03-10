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

// requireMember returns ErrForbidden if callerID is not a member of teamID.
func requireMember(ctx context.Context, repo domains.TeamRepository, teamID, callerID uuid.UUID) error {
	_, err := repo.GetMembership(ctx, domains.GetMembershipRequest{
		TeamID: teamID,
		UserID: callerID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		return ErrForbidden
	}
	if err != nil {
		return fmt.Errorf("check membership: %w", err)
	}
	return nil
}

// requireCoach returns ErrForbidden unless callerID holds the coach role on teamID.
func requireCoach(ctx context.Context, repo domains.TeamRepository, teamID, callerID uuid.UUID) error {
	res, err := repo.GetMembership(ctx, domains.GetMembershipRequest{
		TeamID: teamID,
		UserID: callerID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		return ErrForbidden
	}
	if err != nil {
		return fmt.Errorf("check membership: %w", err)
	}
	if res.Member.Role != models.RoleCoach {
		return ErrForbidden
	}
	return nil
}
