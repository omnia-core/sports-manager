package models

import (
	"time"

	"github.com/google/uuid"
)

// Game represents a single game record for a team.
type Game struct {
	ID            uuid.UUID `json:"id"`
	TeamID        uuid.UUID `json:"team_id"`
	OpponentName  string    `json:"opponent_name"`
	GameDate      time.Time `json:"game_date"`
	// TeamScore is derived from the box score on read, never stored.
	TeamScore     int       `json:"team_score"`
	OpponentScore *int      `json:"opponent_score"`
	CreatedAt     time.Time `json:"created_at"`
}

// GamePlayer is a team member's entry for a specific game.
// is_dnp=true means they did not play.
type GamePlayer struct {
	ID        uuid.UUID `json:"id"`
	GameID    uuid.UUID `json:"game_id"`
	UserID    uuid.UUID `json:"user_id"`
	IsDNP     bool      `json:"is_dnp"`
	CreatedAt time.Time `json:"created_at"`
}

// GameStats holds per-player counting stats for a game.
// FG%, 3P%, FT%, and REB are computed on the frontend.
type GameStats struct {
	ID           uuid.UUID `json:"id"`
	GamePlayerID uuid.UUID `json:"game_player_id"`
	Mins         int       `json:"mins"`
	Pts          int       `json:"pts"`
	FGM          int       `json:"fgm"`
	FGA          int       `json:"fga"`
	ThreePM      int       `json:"three_pm"`
	ThreePA      int       `json:"three_pa"`
	FTM          int       `json:"ftm"`
	FTA          int       `json:"fta"`
	ORB          int       `json:"orb"`
	DRB          int       `json:"drb"`
	AST          int       `json:"ast"`
	STL          int       `json:"stl"`
	BLK          int       `json:"blk"`
	TOV          int       `json:"tov"`
	PF           int       `json:"pf"`
	PlusMinus    int       `json:"plus_minus"`
}
