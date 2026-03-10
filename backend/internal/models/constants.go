package models

// Team-scoped role constants. These values are enforced by a CHECK constraint
// in the team_members table; keep in sync with migration 000003.
const (
	RoleCoach  = "coach"
	RolePlayer = "player"
)

// Invite status constants. These values are enforced by a CHECK constraint
// in the team_invites table; keep in sync with migration 000004.
const (
	InviteStatusPending  = "pending"
	InviteStatusAccepted = "accepted"
	InviteStatusExpired  = "expired"
)
