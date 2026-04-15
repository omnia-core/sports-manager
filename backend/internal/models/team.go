package models

import (
	"time"

	"github.com/google/uuid"
)

// Team represents a sports team owned by a coach.
type Team struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Sport     string    `json:"sport"`
	CoachID   uuid.UUID `json:"coach_id"`
	LogoURL   *string   `json:"logo_url"`
	CreatedAt time.Time `json:"created_at"`
}

// TeamMember represents a user's membership in a team with a team-scoped role.
// UserID is nil for placeholder roster slots that have not yet been linked to a user account.
// Name stores the display name for placeholder members.
type TeamMember struct {
	ID           uuid.UUID  `json:"id"`
	TeamID       uuid.UUID  `json:"team_id"`
	UserID       *uuid.UUID `json:"user_id"`
	Name         *string    `json:"name"`
	Role         string     `json:"role"`
	JerseyNumber *int       `json:"jersey_number"`
	Position     *string    `json:"position"`
	JoinedAt     time.Time  `json:"joined_at"`
}
