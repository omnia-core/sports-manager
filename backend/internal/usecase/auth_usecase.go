package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/auth"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
)

// ErrInvalidCredentials is returned when email/password authentication fails.
// Using a sentinel avoids fragile string-matching in the handler layer.
var ErrInvalidCredentials = errors.New("invalid credentials")

// authUsecase is the concrete implementation of domains.AuthUsecase.
type authUsecase struct {
	repo      domains.AuthRepository
	jwtSecret string
}

// NewAuthUsecase constructs an AuthUsecase.
func NewAuthUsecase(repo domains.AuthRepository, jwtSecret string) domains.AuthUsecase {
	return &authUsecase{repo: repo, jwtSecret: jwtSecret}
}

// Register validates inputs, hashes the password, creates the user, and issues tokens.
func (u *authUsecase) Register(ctx context.Context, req domains.RegisterRequest) (domains.RegisterResponse, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)

	if req.Email == "" || req.Name == "" {
		return domains.RegisterResponse{}, fmt.Errorf("email and name are required")
	}
	// SEC-04: basic email format validation — must contain '@' and a '.' after it.
	if at := strings.Index(req.Email, "@"); at < 1 || !strings.Contains(req.Email[at:], ".") {
		return domains.RegisterResponse{}, fmt.Errorf("email address is invalid")
	}
	if len(req.Password) < 8 {
		return domains.RegisterResponse{}, fmt.Errorf("password must be at least 8 characters")
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return domains.RegisterResponse{}, fmt.Errorf("hash password: %w", err)
	}

	created, err := u.repo.CreateUser(ctx, domains.CreateUserRequest{
		Email:        req.Email,
		PasswordHash: hash,
		Name:         req.Name,
	})
	if err != nil {
		return domains.RegisterResponse{}, err
	}

	accessToken, refreshToken, err := u.issueTokenPair(ctx, created.User.ID)
	if err != nil {
		return domains.RegisterResponse{}, err
	}

	return domains.RegisterResponse{
		User:         created.User,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// Login verifies credentials and issues tokens on success.
func (u *authUsecase) Login(ctx context.Context, req domains.LoginRequest) (domains.LoginResponse, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	found, err := u.repo.GetUserByEmail(ctx, domains.GetUserByEmailRequest{Email: req.Email})
	if errors.Is(err, repository.ErrNotFound) {
		// Deliberately vague to prevent user enumeration.
		return domains.LoginResponse{}, ErrInvalidCredentials
	}
	if err != nil {
		return domains.LoginResponse{}, fmt.Errorf("get user: %w", err)
	}

	if found.User.PasswordHash == nil || !auth.CheckPassword(*found.User.PasswordHash, req.Password) {
		return domains.LoginResponse{}, ErrInvalidCredentials
	}

	accessToken, refreshToken, err := u.issueTokenPair(ctx, found.User.ID)
	if err != nil {
		return domains.LoginResponse{}, err
	}

	return domains.LoginResponse{
		User:         found.User,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// Refresh validates a refresh token and issues a new token pair (rotation).
func (u *authUsecase) Refresh(ctx context.Context, req domains.RefreshRequest) (domains.RefreshResponse, error) {
	claims, err := auth.ValidateToken(req.RawRefreshToken, u.jwtSecret)
	if err != nil {
		return domains.RefreshResponse{}, fmt.Errorf("invalid refresh token")
	}
	if claims.TokenType != auth.TokenTypeRefresh {
		return domains.RefreshResponse{}, fmt.Errorf("invalid token type")
	}

	validated, err := u.repo.ValidateAndDeleteRefreshToken(ctx, domains.ValidateAndDeleteRefreshTokenRequest{
		UserID:   claims.UserID,
		RawToken: req.RawRefreshToken,
	})
	if err != nil {
		return domains.RefreshResponse{}, fmt.Errorf("validate refresh token: %w", err)
	}
	if !validated.Valid {
		return domains.RefreshResponse{}, fmt.Errorf("refresh token expired or already used")
	}

	accessToken, refreshToken, err := u.issueTokenPair(ctx, claims.UserID)
	if err != nil {
		return domains.RefreshResponse{}, err
	}

	return domains.RefreshResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// Logout revokes all refresh tokens for the user identified by the given token.
// Errors are silently ignored — we clear cookies on the HTTP layer regardless.
func (u *authUsecase) Logout(ctx context.Context, req domains.LogoutRequest) error {
	if req.RawRefreshToken == "" {
		return nil
	}

	claims, err := auth.ValidateToken(req.RawRefreshToken, u.jwtSecret)
	if err != nil {
		// Token is malformed or already expired — nothing to revoke.
		return nil
	}

	return u.repo.DeleteAllRefreshTokens(ctx, domains.DeleteAllRefreshTokensRequest{
		UserID: claims.UserID,
	})
}

// GetUser retrieves the current user by ID.
func (u *authUsecase) GetUser(ctx context.Context, req domains.GetUserRequest) (domains.GetUserResponse, error) {
	res, err := u.repo.GetUserByID(ctx, domains.GetUserByIDRequest{UserID: req.UserID})
	if err != nil {
		return domains.GetUserResponse{}, fmt.Errorf("get user: %w", err)
	}
	return domains.GetUserResponse{User: res.User}, nil
}

// issueTokenPair generates an access+refresh token pair, stores the refresh
// token hash in the DB, and returns both raw strings.
func (u *authUsecase) issueTokenPair(ctx context.Context, userID uuid.UUID) (accessToken, refreshToken string, err error) {
	accessToken, err = auth.GenerateAccessToken(userID, u.jwtSecret)
	if err != nil {
		return "", "", fmt.Errorf("generate access token: %w", err)
	}

	refreshToken, err = auth.GenerateRefreshToken(userID, u.jwtSecret)
	if err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}

	storeErr := u.repo.StoreRefreshToken(ctx, domains.StoreRefreshTokenRequest{
		UserID:    userID,
		RawToken:  refreshToken,
		ExpiresAt: time.Now().Add(auth.RefreshTokenTTL),
	})
	if storeErr != nil {
		return "", "", fmt.Errorf("store refresh token: %w", storeErr)
	}

	return accessToken, refreshToken, nil
}
