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
	RemoveMember(ctx context.Context, req RemoveMemberRequest) (RemoveMemberResponse, error)
	AddRosterMember(ctx context.Context, req AddRosterMemberRequest) (AddRosterMemberResponse, error)
	UpdateMember(ctx context.Context, req UpdateMemberRequest) (UpdateMemberResponse, error)
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
	GetMembership(ctx context.Context, req GetMembershipRequest) (GetMembershipResponse, error)
	ListMembers(ctx context.Context, req ListMembersRequest) (ListMembersResponse, error)
	RemoveMember(ctx context.Context, req RemoveMemberRequest) (RemoveMemberResponse, error)
	AddRosterMember(ctx context.Context, req AddRosterMemberRequest) (AddRosterMemberResponse, error)
	UpdateMember(ctx context.Context, req UpdateMemberRequest) (UpdateMemberResponse, error)
}

// ----------------------------------------------------------------------------
// Shared composite type
// ----------------------------------------------------------------------------

// MemberWithUser pairs a TeamMember record with its associated User so the
// frontend can render a roster without issuing extra requests.
// User is nil for placeholder roster slots with no linked account.
type MemberWithUser struct {
	Member models.TeamMember `json:"member"`
	User   *models.User      `json:"user"`
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

type RemoveMemberRequest struct {
	TeamID   uuid.UUID
	MemberID uuid.UUID
	CallerID uuid.UUID
}

type RemoveMemberResponse struct{}

// AddRosterMemberRequest adds a placeholder roster slot (no user account required).
type AddRosterMemberRequest struct {
	TeamID       uuid.UUID
	CallerID     uuid.UUID
	Name         string
	JerseyNumber *int
	Position     *string
}

type AddRosterMemberResponse struct {
	Member *models.TeamMember
}

// UpdateMemberRequest updates jersey number and/or position for a roster slot.
type UpdateMemberRequest struct {
	TeamID       uuid.UUID
	MemberID     uuid.UUID
	CallerID     uuid.UUID
	JerseyNumber *int
	Position     *string
	Name         *string
}

type UpdateMemberResponse struct {
	Member *models.TeamMember
}
