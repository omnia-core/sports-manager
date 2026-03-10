package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"

	AccessTokenTTL  = 60 * time.Minute
	RefreshTokenTTL = 30 * 24 * time.Hour
)

// Claims is the JWT payload shared by both access and refresh tokens.
// TokenType distinguishes them — middleware must reject refresh tokens on
// protected endpoints.
type Claims struct {
	UserID    uuid.UUID `json:"user_id"`
	TokenType string    `json:"token_type"`
	jwt.RegisteredClaims
}

// GenerateAccessToken issues a short-lived access token (60 min).
func GenerateAccessToken(userID uuid.UUID, secret string) (string, error) {
	return generateToken(userID, TokenTypeAccess, AccessTokenTTL, secret)
}

// GenerateRefreshToken issues a long-lived refresh token (30 days).
func GenerateRefreshToken(userID uuid.UUID, secret string) (string, error) {
	return generateToken(userID, TokenTypeRefresh, RefreshTokenTTL, secret)
}

func generateToken(userID uuid.UUID, tokenType string, ttl time.Duration, secret string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:    userID,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

// ValidateToken parses and validates a JWT string, returning its claims.
// Callers must check Claims.TokenType against the expected type.
func ValidateToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	}, jwt.WithExpirationRequired())
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}
	return claims, nil
}
