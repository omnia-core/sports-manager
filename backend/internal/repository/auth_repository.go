package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
)

// authRepository is the concrete PostgreSQL implementation of domains.AuthRepository.
type authRepository struct {
	db *sql.DB
}

// NewAuthRepository constructs an AuthRepository backed by the given *sql.DB.
func NewAuthRepository(db *sql.DB) domains.AuthRepository {
	return &authRepository{db: db}
}

// StoreRefreshToken persists a SHA-256 hash of the refresh token string.
// The raw token is never written to the database.
func (r *authRepository) StoreRefreshToken(ctx context.Context, req domains.StoreRefreshTokenRequest) error {
	hash := hashToken(req.RawToken)
	const q = `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)`

	_, err := r.db.ExecContext(ctx, q, req.UserID, hash, req.ExpiresAt)
	if err != nil {
		return fmt.Errorf("store refresh token: %w", err)
	}
	return nil
}

// ValidateAndDeleteRefreshToken checks that the token hash exists, belongs to
// the given user, and is not expired. If valid it deletes the record (rotation)
// and returns Valid=true.
func (r *authRepository) ValidateAndDeleteRefreshToken(ctx context.Context, req domains.ValidateAndDeleteRefreshTokenRequest) (domains.ValidateAndDeleteRefreshTokenResponse, error) {
	hash := hashToken(req.RawToken)
	const q = `
		DELETE FROM refresh_tokens
		WHERE token_hash = $1
		  AND user_id    = $2
		  AND expires_at > NOW()
		RETURNING id`

	var id uuid.UUID
	err := r.db.QueryRowContext(ctx, q, hash, req.UserID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.ValidateAndDeleteRefreshTokenResponse{Valid: false}, nil
	}
	if err != nil {
		return domains.ValidateAndDeleteRefreshTokenResponse{}, fmt.Errorf("validate refresh token: %w", err)
	}
	return domains.ValidateAndDeleteRefreshTokenResponse{Valid: true}, nil
}

// DeleteAllRefreshTokens removes every refresh token for a user (logout / revoke all).
func (r *authRepository) DeleteAllRefreshTokens(ctx context.Context, req domains.DeleteAllRefreshTokensRequest) error {
	const q = `DELETE FROM refresh_tokens WHERE user_id = $1`
	_, err := r.db.ExecContext(ctx, q, req.UserID)
	if err != nil {
		return fmt.Errorf("delete refresh tokens: %w", err)
	}
	return nil
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", sum)
}

// RefreshTokenExpiresAt returns the expiry time for a new refresh token.
func RefreshTokenExpiresAt() time.Time {
	return time.Now().Add(30 * 24 * time.Hour)
}
