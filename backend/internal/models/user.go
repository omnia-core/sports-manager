package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents an authenticated identity. Role is team-scoped and lives on
// TeamMember, not here — a person can coach one team and play on another.
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash *string   `json:"-"`
	GoogleID     *string   `json:"-"`
	Name         string    `json:"name"`
	AvatarURL    *string   `json:"avatar_url"`
	CreatedAt    time.Time `json:"created_at"`
}
