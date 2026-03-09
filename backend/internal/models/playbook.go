package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Playbook represents a named collection of plays belonging to a team.
type Playbook struct {
	ID          uuid.UUID `json:"id"`
	TeamID      uuid.UUID `json:"team_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// Play represents a single diagrammed play within a playbook.
type Play struct {
	ID          uuid.UUID        `json:"id"`
	PlaybookID  uuid.UUID        `json:"playbook_id"`
	Name        string           `json:"name"`
	Category    string           `json:"category"`
	Description *string          `json:"description"`
	DiagramJSON *json.RawMessage `json:"diagram_json"`
	CreatedAt   time.Time        `json:"created_at"`
}
