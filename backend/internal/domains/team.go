package domains

import (
	"context"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// ----------------------------------------------------------------------------
// Team Usecase
// ----------------------------------------------------------------------------

// TeamUsecase defines business-logic operations for team management.
type TeamUsecase interface {
	CreateTeam(ctx context.Context, req CreateTeamRequest) (CreateTeamResponse, error)
	GetTeam(ctx context.Context, req GetTeamRequest) (GetTeamResponse, error)
	ListTeams(ctx context.Context, req ListTeamsRequest) (ListTeamsResponse, error)
	UpdateTeam(ctx context.Context, req UpdateTeamRequest) (UpdateTeamResponse, error)
	DeleteTeam(ctx context.Context, req DeleteTeamRequest) (DeleteTeamResponse, error)
	ListMembers(ctx context.Context, req ListMembersRequest) (ListMembersResponse, error)
}

// ----------------------------------------------------------------------------
// Team Repository
// ----------------------------------------------------------------------------

// TeamRepository defines all persistence operations required by the team domain.
type TeamRepository interface {
	CreateTeam(ctx context.Context, req CreateTeamRequest) (CreateTeamResponse, error)
	GetTeam(ctx context.Context, req GetTeamRequest) (GetTeamResponse, error)
	ListTeams(ctx context.Context, req ListTeamsRequest) (ListTeamsResponse, error)
	UpdateTeam(ctx context.Context, req UpdateTeamRequest) (UpdateTeamResponse, error)
	DeleteTeam(ctx context.Context, req DeleteTeamRequest) (DeleteTeamResponse, error)
	AddMember(ctx context.Context, req AddMemberRequest) (AddMemberResponse, error)
	GetMembership(ctx context.Context, req GetMembershipRequest) (GetMembershipResponse, error)
	ListMembers(ctx context.Context, req ListMembersRequest) (ListMembersResponse, error)
}

// ----------------------------------------------------------------------------
// Shared composite type
// ----------------------------------------------------------------------------

// MemberWithUser pairs a TeamMember record with its associated User so the
// frontend can render a roster without issuing extra requests.
type MemberWithUser struct {
	Member models.TeamMember `json:"member"`
	User   models.User       `json:"user"`
}

// ----------------------------------------------------------------------------
// Request / Response types
// ----------------------------------------------------------------------------

type CreateTeamRequest struct {
	Name    string
	Sport   string
	CoachID uuid.UUID
}

type CreateTeamResponse struct {
	Team *models.Team
}

type GetTeamRequest struct {
	TeamID    uuid.UUID
	CallerID  uuid.UUID
}

type GetTeamResponse struct {
	Team *models.Team
}

type ListTeamsRequest struct {
	UserID uuid.UUID
}

type ListTeamsResponse struct {
	Teams []*models.Team
}

type UpdateTeamRequest struct {
	TeamID   uuid.UUID
	CallerID uuid.UUID
	Name     *string
	LogoURL  *string
}

type UpdateTeamResponse struct {
	Team *models.Team
}

type DeleteTeamRequest struct {
	TeamID   uuid.UUID
	CallerID uuid.UUID
}

type DeleteTeamResponse struct{}

type AddMemberRequest struct {
	TeamID uuid.UUID
	UserID uuid.UUID
	Role   string
}

type AddMemberResponse struct {
	Member *models.TeamMember
}

type GetMembershipRequest struct {
	TeamID uuid.UUID
	UserID uuid.UUID
}

type GetMembershipResponse struct {
	Member *models.TeamMember
}

type ListMembersRequest struct {
	TeamID   uuid.UUID
	CallerID uuid.UUID
}

type ListMembersResponse struct {
	Members []MemberWithUser
}
