package domains

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// ----------------------------------------------------------------------------
// Playbook Usecase
// ----------------------------------------------------------------------------

// PlaybookUsecase defines business-logic operations for playbooks and plays.
// Play operations are included here because plays are wholly owned by a
// playbook, which is wholly owned by a team — access control always flows
// through the playbook → team membership chain.
type PlaybookUsecase interface {
	// Playbook operations
	CreatePlaybook(ctx context.Context, req CreatePlaybookRequest) (CreatePlaybookResponse, error)
	GetPlaybook(ctx context.Context, req GetPlaybookRequest) (GetPlaybookResponse, error)
	ListPlaybooks(ctx context.Context, req ListPlaybooksRequest) (ListPlaybooksResponse, error)
	UpdatePlaybook(ctx context.Context, req UpdatePlaybookRequest) (UpdatePlaybookResponse, error)
	DeletePlaybook(ctx context.Context, req DeletePlaybookRequest) (DeletePlaybookResponse, error)

	// Play operations
	CreatePlay(ctx context.Context, req CreatePlayRequest) (CreatePlayResponse, error)
	GetPlay(ctx context.Context, req GetPlayRequest) (GetPlayResponse, error)
	ListPlays(ctx context.Context, req ListPlaysRequest) (ListPlaysResponse, error)
	UpdatePlay(ctx context.Context, req UpdatePlayRequest) (UpdatePlayResponse, error)
	DeletePlay(ctx context.Context, req DeletePlayRequest) (DeletePlayResponse, error)
}

// ----------------------------------------------------------------------------
// Playbook Repository
// ----------------------------------------------------------------------------

// PlaybookRepository defines all persistence operations for the playbook domain.
type PlaybookRepository interface {
	// Playbook operations
	CreatePlaybook(ctx context.Context, req CreatePlaybookRequest) (CreatePlaybookResponse, error)
	GetPlaybook(ctx context.Context, req GetPlaybookRequest) (GetPlaybookResponse, error)
	ListPlaybooks(ctx context.Context, req ListPlaybooksRequest) (ListPlaybooksResponse, error)
	UpdatePlaybook(ctx context.Context, req UpdatePlaybookRequest) (UpdatePlaybookResponse, error)
	DeletePlaybook(ctx context.Context, req DeletePlaybookRequest) (DeletePlaybookResponse, error)

	// Play operations
	CreatePlay(ctx context.Context, req CreatePlayRequest) (CreatePlayResponse, error)
	GetPlay(ctx context.Context, req GetPlayRequest) (GetPlayResponse, error)
	ListPlays(ctx context.Context, req ListPlaysRequest) (ListPlaysResponse, error)
	UpdatePlay(ctx context.Context, req UpdatePlayRequest) (UpdatePlayResponse, error)
	DeletePlay(ctx context.Context, req DeletePlayRequest) (DeletePlayResponse, error)
}

// ----------------------------------------------------------------------------
// Playbook Request / Response types
// ----------------------------------------------------------------------------

type CreatePlaybookRequest struct {
	TeamID      uuid.UUID
	CallerID    uuid.UUID
	Name        string
	Description *string
}

type CreatePlaybookResponse struct {
	Playbook *models.Playbook
}

type GetPlaybookRequest struct {
	PlaybookID uuid.UUID
	CallerID   uuid.UUID
}

type GetPlaybookResponse struct {
	Playbook *models.Playbook
}

type ListPlaybooksRequest struct {
	TeamID   uuid.UUID
	CallerID uuid.UUID
}

type ListPlaybooksResponse struct {
	Playbooks []*models.Playbook
}

type UpdatePlaybookRequest struct {
	PlaybookID  uuid.UUID
	CallerID    uuid.UUID
	Name        *string
	Description *string
}

type UpdatePlaybookResponse struct {
	Playbook *models.Playbook
}

type DeletePlaybookRequest struct {
	PlaybookID uuid.UUID
	CallerID   uuid.UUID
}

type DeletePlaybookResponse struct{}

// ----------------------------------------------------------------------------
// Play Request / Response types
// ----------------------------------------------------------------------------

type CreatePlayRequest struct {
	PlaybookID  uuid.UUID
	CallerID    uuid.UUID
	Name        string
	Category    string
	Description *string
	DiagramJSON *json.RawMessage
}

type CreatePlayResponse struct {
	Play *models.Play
}

type GetPlayRequest struct {
	PlayID   uuid.UUID
	CallerID uuid.UUID
}

type GetPlayResponse struct {
	Play *models.Play
}

type ListPlaysRequest struct {
	PlaybookID uuid.UUID
	CallerID   uuid.UUID
}

type ListPlaysResponse struct {
	Plays []*models.Play
}

type UpdatePlayRequest struct {
	PlayID      uuid.UUID
	CallerID    uuid.UUID
	Name        *string
	Category    *string
	Description *string
	DiagramJSON *json.RawMessage
}

type UpdatePlayResponse struct {
	Play *models.Play
}

type DeletePlayRequest struct {
	PlayID   uuid.UUID
	CallerID uuid.UUID
}

type DeletePlayResponse struct{}
