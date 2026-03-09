package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// ErrNotFound is returned when a requested record does not exist.
var ErrNotFound = errors.New("not found")

// CreateUser inserts a new user and returns the created record.
func (r *authRepository) CreateUser(ctx context.Context, req domains.CreateUserRequest) (domains.CreateUserResponse, error) {
	const q = `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id, email, password_hash, google_id, name, avatar_url, created_at`

	u := &models.User{}
	err := r.db.QueryRowContext(ctx, q, req.Email, req.PasswordHash, req.Name).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.GoogleID,
		&u.Name,
		&u.AvatarURL,
		&u.CreatedAt,
	)
	if err != nil {
		return domains.CreateUserResponse{}, fmt.Errorf("create user: %w", err)
	}
	return domains.CreateUserResponse{User: u}, nil
}

// GetUserByEmail returns a user matching the given email, or ErrNotFound.
func (r *authRepository) GetUserByEmail(ctx context.Context, req domains.GetUserByEmailRequest) (domains.GetUserByEmailResponse, error) {
	const q = `
		SELECT id, email, password_hash, google_id, name, avatar_url, created_at
		FROM users
		WHERE email = $1`

	u := &models.User{}
	err := r.db.QueryRowContext(ctx, q, req.Email).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.GoogleID,
		&u.Name,
		&u.AvatarURL,
		&u.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetUserByEmailResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetUserByEmailResponse{}, fmt.Errorf("get user by email: %w", err)
	}
	return domains.GetUserByEmailResponse{User: u}, nil
}

// GetUserByID returns a user matching the given UUID, or ErrNotFound.
func (r *authRepository) GetUserByID(ctx context.Context, req domains.GetUserByIDRequest) (domains.GetUserByIDResponse, error) {
	const q = `
		SELECT id, email, password_hash, google_id, name, avatar_url, created_at
		FROM users
		WHERE id = $1`

	u := &models.User{}
	err := r.db.QueryRowContext(ctx, q, req.UserID).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.GoogleID,
		&u.Name,
		&u.AvatarURL,
		&u.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetUserByIDResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetUserByIDResponse{}, fmt.Errorf("get user by id: %w", err)
	}
	return domains.GetUserByIDResponse{User: u}, nil
}

// GetOrCreateGoogleUser upserts a user identified by their Google ID.
// If a user with the given email already exists, google_id is attached to that
// account (linking). Otherwise a new user is created.
func (r *authRepository) GetOrCreateGoogleUser(ctx context.Context, req domains.GetOrCreateGoogleUserRequest) (domains.GetOrCreateGoogleUserResponse, error) {
	const q = `
		INSERT INTO users (email, google_id, name, avatar_url)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (email) DO UPDATE
			SET google_id  = EXCLUDED.google_id,
			    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
		RETURNING id, email, password_hash, google_id, name, avatar_url, created_at`

	u := &models.User{}
	err := r.db.QueryRowContext(ctx, q, req.Email, req.GoogleID, req.Name, req.AvatarURL).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.GoogleID,
		&u.Name,
		&u.AvatarURL,
		&u.CreatedAt,
	)
	if err != nil {
		return domains.GetOrCreateGoogleUserResponse{}, fmt.Errorf("get or create google user: %w", err)
	}
	return domains.GetOrCreateGoogleUserResponse{User: u}, nil
}
