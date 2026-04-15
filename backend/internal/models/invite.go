package models

import (
	"time"

	"github.com/google/uuid"
)

// TeamInvite represents a pending or resolved invitation for a player to join a team.
// TeamMemberID links the invite to a specific placeholder roster slot when set.
type TeamInvite struct {
	ID           uuid.UUID  `json:"id"`
	TeamID       uuid.UUID  `json:"team_id"`
	Email        string     `json:"email"`
	Token        uuid.UUID  `json:"token"`
	Status       string     `json:"status"`
	TeamMemberID *uuid.UUID `json:"team_member_id"`
	ExpiresAt    time.Time  `json:"expires_at"`
	CreatedAt    time.Time  `json:"created_at"`
}
