package domains

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// ----------------------------------------------------------------------------
// Auth Usecase
// ----------------------------------------------------------------------------

// AuthUsecase defines business-logic operations for authentication.
type AuthUsecase interface {
	Register(ctx context.Context, req RegisterRequest) (RegisterResponse, error)
	Login(ctx context.Context, req LoginRequest) (LoginResponse, error)
	Refresh(ctx context.Context, req RefreshRequest) (RefreshResponse, error)
	Logout(ctx context.Context, req LogoutRequest) error
	GetUser(ctx context.Context, req GetUserRequest) (GetUserResponse, error)
}

// RegisterRequest carries the inputs for a new user registration.
type RegisterRequest struct {
	Email    string
	Password string
	Name     string
}

// RegisterResponse carries the created user and issued token strings.
type RegisterResponse struct {
	User         *models.User
	AccessToken  string
	RefreshToken string
}

// LoginRequest carries credentials for an email/password login.
type LoginRequest struct {
	Email    string
	Password string
}

// LoginResponse carries the authenticated user and issued token strings.
type LoginResponse struct {
	User         *models.User
	AccessToken  string
	RefreshToken string
}

// RefreshRequest carries the raw refresh token string.
type RefreshRequest struct {
	RawRefreshToken string
}

// RefreshResponse carries the newly issued token strings.
type RefreshResponse struct {
	AccessToken  string
	RefreshToken string
}

// LogoutRequest carries the raw refresh token so it can be revoked.
type LogoutRequest struct {
	RawRefreshToken string
}

// GetUserRequest carries the authenticated user's ID.
type GetUserRequest struct {
	UserID uuid.UUID
}

// GetUserResponse carries the user record.
type GetUserResponse struct {
	User *models.User
}

// ----------------------------------------------------------------------------
// Auth Repository
// ----------------------------------------------------------------------------

// AuthRepository defines all persistence operations required by auth.
type AuthRepository interface {
	CreateUser(ctx context.Context, req CreateUserRequest) (CreateUserResponse, error)
	GetUserByEmail(ctx context.Context, req GetUserByEmailRequest) (GetUserByEmailResponse, error)
	GetUserByID(ctx context.Context, req GetUserByIDRequest) (GetUserByIDResponse, error)
	GetOrCreateGoogleUser(ctx context.Context, req GetOrCreateGoogleUserRequest) (GetOrCreateGoogleUserResponse, error)
	StoreRefreshToken(ctx context.Context, req StoreRefreshTokenRequest) error
	ValidateAndDeleteRefreshToken(ctx context.Context, req ValidateAndDeleteRefreshTokenRequest) (ValidateAndDeleteRefreshTokenResponse, error)
	DeleteAllRefreshTokens(ctx context.Context, req DeleteAllRefreshTokensRequest) error
}

// CreateUserRequest carries the fields for inserting a new user row.
type CreateUserRequest struct {
	Email        string
	PasswordHash string
	Name         string
}

// CreateUserResponse carries the created user.
type CreateUserResponse struct {
	User *models.User
}

// GetUserByEmailRequest carries the lookup key.
type GetUserByEmailRequest struct {
	Email string
}

// GetUserByEmailResponse carries the found user.
type GetUserByEmailResponse struct {
	User *models.User
}

// GetUserByIDRequest carries the lookup key.
type GetUserByIDRequest struct {
	UserID uuid.UUID
}

// GetUserByIDResponse carries the found user.
type GetUserByIDResponse struct {
	User *models.User
}

// GetOrCreateGoogleUserRequest carries the Google profile data.
type GetOrCreateGoogleUserRequest struct {
	GoogleID  string
	Email     string
	Name      string
	AvatarURL string
}

// GetOrCreateGoogleUserResponse carries the upserted user.
type GetOrCreateGoogleUserResponse struct {
	User *models.User
}

// StoreRefreshTokenRequest carries the data needed to persist a refresh token.
type StoreRefreshTokenRequest struct {
	UserID    uuid.UUID
	RawToken  string
	ExpiresAt time.Time
}

// ValidateAndDeleteRefreshTokenRequest carries the token to validate and rotate.
type ValidateAndDeleteRefreshTokenRequest struct {
	UserID   uuid.UUID
	RawToken string
}

// ValidateAndDeleteRefreshTokenResponse reports whether the token was valid.
type ValidateAndDeleteRefreshTokenResponse struct {
	Valid bool
}

// DeleteAllRefreshTokensRequest carries the user whose tokens should be revoked.
type DeleteAllRefreshTokensRequest struct {
	UserID uuid.UUID
}
