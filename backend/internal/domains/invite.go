package domains

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// ----------------------------------------------------------------------------
// Invite Usecase
// ----------------------------------------------------------------------------

// InviteUsecase defines business-logic operations for the team invite flow.
type InviteUsecase interface {
	// CreateInvite creates an invite record and sends the invite email. The
	// caller must be a coach on the target team.
	CreateInvite(ctx context.Context, req CreateInviteRequest) (CreateInviteResponse, error)

	// AcceptInvite validates the invite token and adds the authenticated user
	// to the team as a player. The entire operation runs atomically.
	AcceptInvite(ctx context.Context, req AcceptInviteRequest) (AcceptInviteResponse, error)
}

// ----------------------------------------------------------------------------
// Invite Repository
// ----------------------------------------------------------------------------

// InviteRepository defines all persistence operations required by the invite domain.
type InviteRepository interface {
	CreateInvite(ctx context.Context, req CreateInviteRequest) (CreateInviteResponse, error)
	GetInviteByToken(ctx context.Context, req GetInviteByTokenRequest) (GetInviteByTokenResponse, error)
	GetInviteByTeamAndEmail(ctx context.Context, req GetInviteByTeamAndEmailRequest) (GetInviteByTeamAndEmailResponse, error)
	// AcceptInviteAtomic adds the user to team_members and marks the invite
	// accepted within a single database transaction. The transaction is managed
	// entirely inside this method so the usecase stays free of *sql.Tx wiring.
	AcceptInviteAtomic(ctx context.Context, req AcceptInviteAtomicRequest) (AcceptInviteAtomicResponse, error)
}

// ----------------------------------------------------------------------------
// Request / Response types
// ----------------------------------------------------------------------------

type CreateInviteRequest struct {
	TeamID   uuid.UUID
	CallerID uuid.UUID // must be coach on the team
	Email    string
	TeamName string // resolved by the usecase; passed to mailer
}

type CreateInviteResponse struct {
	Invite *models.TeamInvite
}

type AcceptInviteRequest struct {
	Token  uuid.UUID
	UserID uuid.UUID // authenticated user accepting the invite
}

type AcceptInviteResponse struct {
	Member *models.TeamMember
}

type GetInviteByTokenRequest struct {
	Token uuid.UUID
}

type GetInviteByTokenResponse struct {
	Invite *models.TeamInvite
}

type GetInviteByTeamAndEmailRequest struct {
	TeamID uuid.UUID
	Email  string
}

type GetInviteByTeamAndEmailResponse struct {
	Invite *models.TeamInvite
}

// AcceptInviteAtomicRequest carries everything the repository needs to execute
// the accept-invite transaction: mark invite accepted + insert team_members row.
type AcceptInviteAtomicRequest struct {
	InviteID  uuid.UUID
	TeamID    uuid.UUID
	UserID    uuid.UUID
	ExpiresAt time.Time // used to double-check expiry inside the tx
}

type AcceptInviteAtomicResponse struct {
	Member *models.TeamMember
}
