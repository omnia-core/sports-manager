package domains

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// ----------------------------------------------------------------------------
// Usecase interface
// ----------------------------------------------------------------------------

type GameUsecase interface {
	CreateGame(ctx context.Context, req CreateGameRequest) (CreateGameResponse, error)
	ListGames(ctx context.Context, req ListGamesRequest) (ListGamesResponse, error)
	GetGameDetail(ctx context.Context, req GetGameDetailRequest) (GetGameDetailResponse, error)
	UpdateGame(ctx context.Context, req UpdateGameRequest) (UpdateGameResponse, error)
	DeleteGame(ctx context.Context, req DeleteGameRequest) (DeleteGameResponse, error)
	UpsertStats(ctx context.Context, req UpsertStatsRequest) (UpsertStatsResponse, error)
	ToggleDNP(ctx context.Context, req ToggleDNPRequest) (ToggleDNPResponse, error)
}

// ----------------------------------------------------------------------------
// Repository interface
// ----------------------------------------------------------------------------

type GameRepository interface {
	CreateGame(ctx context.Context, req CreateGameRequest) (CreateGameResponse, error)
	SeedGamePlayers(ctx context.Context, req SeedGamePlayersRequest) (SeedGamePlayersResponse, error)
	GetGame(ctx context.Context, req GetGameRequest) (GetGameResponse, error)
	ListGames(ctx context.Context, req ListGamesRequest) (ListGamesResponse, error)
	GetGameDetail(ctx context.Context, req GetGameDetailRequest) (GetGameDetailResponse, error)
	UpdateGame(ctx context.Context, req UpdateGameRequest) (UpdateGameResponse, error)
	DeleteGame(ctx context.Context, req DeleteGameRequest) (DeleteGameResponse, error)
	UpsertStats(ctx context.Context, req UpsertStatsRequest) (UpsertStatsResponse, error)
	ToggleDNP(ctx context.Context, req ToggleDNPRequest) (ToggleDNPResponse, error)
}

// ----------------------------------------------------------------------------
// Shared composite type
// ----------------------------------------------------------------------------

// GameDetailPlayer is the combined view of a player's participation in a game,
// used in the GET /api/games/:gameID response.
type GameDetailPlayer struct {
	MemberID     uuid.UUID         `json:"member_id"`
	Name         string            `json:"name"`
	JerseyNumber *int              `json:"jersey_number"`
	Position     *string           `json:"position"`
	IsDNP        bool              `json:"is_dnp"`
	Stats        *models.GameStats `json:"stats"`
}

// ----------------------------------------------------------------------------
// Request / Response types
// ----------------------------------------------------------------------------

type CreateGameRequest struct {
	TeamID       uuid.UUID
	CallerID     uuid.UUID
	OpponentName string
	GameDate     time.Time
}

type CreateGameResponse struct {
	Game *models.Game
}

type SeedGamePlayersRequest struct {
	GameID    uuid.UUID
	MemberIDs []uuid.UUID
}

type SeedGamePlayersResponse struct{}

type GetGameRequest struct {
	GameID   uuid.UUID
	CallerID uuid.UUID
}

type GetGameResponse struct {
	Game *models.Game
}

type ListGamesRequest struct {
	TeamID   uuid.UUID
	CallerID uuid.UUID
}

type ListGamesResponse struct {
	Games []*models.Game
}

type GetGameDetailRequest struct {
	GameID   uuid.UUID
	CallerID uuid.UUID
}

type GetGameDetailResponse struct {
	Game    *models.Game       `json:"game"`
	Players []GameDetailPlayer `json:"players"`
}

type UpdateGameRequest struct {
	GameID        uuid.UUID
	CallerID      uuid.UUID
	OpponentName  *string
	GameDate      *time.Time
	TeamScore     *int
	OpponentScore *int
}

type UpdateGameResponse struct {
	Game *models.Game
}

type DeleteGameRequest struct {
	GameID   uuid.UUID
	CallerID uuid.UUID
}

type DeleteGameResponse struct{}

type UpsertStatsRequest struct {
	GameID    uuid.UUID
	MemberID  uuid.UUID
	CallerID  uuid.UUID
	Mins      int
	Pts       int
	FGM       int
	FGA       int
	ThreePM   int
	ThreePA   int
	FTM       int
	FTA       int
	ORB       int
	DRB       int
	AST       int
	STL       int
	BLK       int
	TOV       int
	PF        int
	PlusMinus int
}

type UpsertStatsResponse struct {
	Stats *models.GameStats
}

type ToggleDNPRequest struct {
	GameID   uuid.UUID
	MemberID uuid.UUID
	CallerID uuid.UUID
}

type ToggleDNPResponse struct {
	IsDNP bool `json:"is_dnp"`
}
