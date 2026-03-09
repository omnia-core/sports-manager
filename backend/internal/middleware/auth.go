package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/omnia-core/sports-manager/backend/internal/auth"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

type contextKey string

const userContextKey contextKey = "user"

// Authenticate validates the access_token cookie and sets the authenticated
// user on the request context. Returns 401 if the token is missing or invalid.
func Authenticate(secret string, authUsecase domains.AuthUsecase) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("access_token")
			if err != nil {
				writeError(w, http.StatusUnauthorized, "missing access token")
				return
			}

			claims, err := auth.ValidateToken(cookie.Value, secret)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "invalid access token")
				return
			}

			// Explicitly reject refresh tokens presented on auth-required endpoints.
			if claims.TokenType != auth.TokenTypeAccess {
				writeError(w, http.StatusUnauthorized, "invalid token type")
				return
			}

			res, err := authUsecase.GetUser(r.Context(), domains.GetUserRequest{UserID: claims.UserID})
			if err != nil {
				writeError(w, http.StatusUnauthorized, "user not found")
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, res.User)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserFromContext retrieves the authenticated user from the request context.
func UserFromContext(ctx context.Context) (*models.User, bool) {
	u, ok := ctx.Value(userContextKey).(*models.User)
	return u, ok
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
