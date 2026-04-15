package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/lib/pq"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// ErrAlreadyMember is returned when the user is already a member of the team.
var ErrAlreadyMember = errors.New("user is already a member of this team")

// inviteRepository is the concrete PostgreSQL implementation of domains.InviteRepository.
//
// Transaction design note: AcceptInviteAtomic manages its own transaction
// internally. This keeps *sql.Tx out of the usecase layer and ensures the
// two writes (upsert team_members + update invite status) are always atomic
// without leaking DB primitives beyond the repository boundary.
type inviteRepository struct {
	db *sql.DB
}

// NewInviteRepository constructs an InviteRepository backed by the given *sql.DB.
func NewInviteRepository(db *sql.DB) domains.InviteRepository {
	return &inviteRepository{db: db}
}

// CreateInvite inserts a new team_invites row and returns the created record.
func (r *inviteRepository) CreateInvite(ctx context.Context, req domains.CreateInviteRequest) (domains.CreateInviteResponse, error) {
	const q = `
		INSERT INTO team_invites (team_id, email, team_member_id)
		VALUES ($1, $2, $3)
		RETURNING id, team_id, email, token, status, team_member_id, expires_at, created_at`

	inv := &models.TeamInvite{}
	err := r.db.QueryRowContext(ctx, q, req.TeamID, req.Email, req.TeamMemberID).Scan(
		&inv.ID,
		&inv.TeamID,
		&inv.Email,
		&inv.Token,
		&inv.Status,
		&inv.TeamMemberID,
		&inv.ExpiresAt,
		&inv.CreatedAt,
	)
	if err != nil {
		return domains.CreateInviteResponse{}, fmt.Errorf("create invite: %w", err)
	}
	return domains.CreateInviteResponse{Invite: inv}, nil
}

// GetInviteByToken returns the invite matching the given token, or ErrNotFound.
func (r *inviteRepository) GetInviteByToken(ctx context.Context, req domains.GetInviteByTokenRequest) (domains.GetInviteByTokenResponse, error) {
	const q = `
		SELECT id, team_id, email, token, status, team_member_id, expires_at, created_at
		FROM team_invites
		WHERE token = $1`

	inv := &models.TeamInvite{}
	err := r.db.QueryRowContext(ctx, q, req.Token).Scan(
		&inv.ID,
		&inv.TeamID,
		&inv.Email,
		&inv.Token,
		&inv.Status,
		&inv.TeamMemberID,
		&inv.ExpiresAt,
		&inv.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetInviteByTokenResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetInviteByTokenResponse{}, fmt.Errorf("get invite by token: %w", err)
	}
	return domains.GetInviteByTokenResponse{Invite: inv}, nil
}

// GetInviteByTeamAndEmail returns the most recent invite for a given team+email
// pair, or ErrNotFound. Used to enforce the no-duplicate-pending-invite rule.
func (r *inviteRepository) GetInviteByTeamAndEmail(ctx context.Context, req domains.GetInviteByTeamAndEmailRequest) (domains.GetInviteByTeamAndEmailResponse, error) {
	const q = `
		SELECT id, team_id, email, token, status, team_member_id, expires_at, created_at
		FROM team_invites
		WHERE team_id = $1 AND email = $2
		ORDER BY created_at DESC
		LIMIT 1`

	inv := &models.TeamInvite{}
	err := r.db.QueryRowContext(ctx, q, req.TeamID, req.Email).Scan(
		&inv.ID,
		&inv.TeamID,
		&inv.Email,
		&inv.Token,
		&inv.Status,
		&inv.TeamMemberID,
		&inv.ExpiresAt,
		&inv.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetInviteByTeamAndEmailResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetInviteByTeamAndEmailResponse{}, fmt.Errorf("get invite by team and email: %w", err)
	}
	return domains.GetInviteByTeamAndEmailResponse{Invite: inv}, nil
}

// AcceptInviteAtomic marks the invite accepted and either updates the placeholder
// roster slot (when TeamMemberID is set) or inserts a new team_members row,
// all within a single transaction.
//
// The UPDATE re-checks expires_at inside the transaction to close the TOCTOU
// window between the usecase's expiry check and this write.
func (r *inviteRepository) AcceptInviteAtomic(ctx context.Context, req domains.AcceptInviteAtomicRequest) (domains.AcceptInviteAtomicResponse, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domains.AcceptInviteAtomicResponse{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // rolled back on error paths; committed on success

	var m *models.TeamMember
	if req.TeamMemberID != nil {
		// Update the placeholder slot: set user_id to link the account.
		const updateMemberQ = `
			UPDATE team_members
			SET user_id = $1
			WHERE id = $2 AND team_id = $3 AND user_id IS NULL
			RETURNING id, team_id, user_id, name, role, jersey_number, position, joined_at`
		m = &models.TeamMember{}
		err = tx.QueryRowContext(ctx, updateMemberQ, req.UserID, req.TeamMemberID, req.TeamID).Scan(
			&m.ID,
			&m.TeamID,
			&m.UserID,
			&m.Name,
			&m.Role,
			&m.JerseyNumber,
			&m.Position,
			&m.JoinedAt,
		)
		if errors.Is(err, sql.ErrNoRows) {
			// Slot was already claimed or doesn't exist — fall back to inserting a new row.
			m, err = insertMember(ctx, tx, domains.AddMemberRequest{
				TeamID: req.TeamID,
				UserID: req.UserID,
				Role:   "player",
			})
		}
	} else {
		m, err = insertMember(ctx, tx, domains.AddMemberRequest{
			TeamID: req.TeamID,
			UserID: req.UserID,
			Role:   "player",
		})
	}
	if err != nil {
		// Unique constraint violation: user is already on this team.
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return domains.AcceptInviteAtomicResponse{}, ErrAlreadyMember
		}
		return domains.AcceptInviteAtomicResponse{}, fmt.Errorf("add team member: %w", err)
	}

	// Re-check expiry atomically inside the transaction to close the TOCTOU
	// window between the usecase's pre-check and this write.
	const updateQ = `
		UPDATE team_invites
		SET status = 'accepted'
		WHERE id = $1
		  AND expires_at > NOW()`
	res, err := tx.ExecContext(ctx, updateQ, req.InviteID)
	if err != nil {
		return domains.AcceptInviteAtomicResponse{}, fmt.Errorf("mark invite accepted: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return domains.AcceptInviteAtomicResponse{}, fmt.Errorf("mark invite accepted rows affected: %w", err)
	}
	if n == 0 {
		// Invite expired between the usecase check and this transaction.
		return domains.AcceptInviteAtomicResponse{}, ErrInviteExpiredInTx
	}

	if err := tx.Commit(); err != nil {
		return domains.AcceptInviteAtomicResponse{}, fmt.Errorf("commit transaction: %w", err)
	}
	return domains.AcceptInviteAtomicResponse{Member: m}, nil
}

// ErrInviteExpiredInTx is returned by AcceptInviteAtomic when the invite
// expired between the usecase's pre-check and the atomic UPDATE inside the
// transaction. The invite handler maps this to ErrInviteInvalid.
var ErrInviteExpiredInTx = errors.New("invite expired")
