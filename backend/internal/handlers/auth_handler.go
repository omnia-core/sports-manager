package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/omnia-core/sports-manager/backend/internal/auth"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/middleware"
	pkgcookie "github.com/omnia-core/sports-manager/backend/internal/pkg/cookie"
)

// AuthHandler handles all auth HTTP endpoints.
type AuthHandler struct {
	usecase domains.AuthUsecase
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(usecase domains.AuthUsecase) *AuthHandler {
	return &AuthHandler{usecase: usecase}
}

// --- Register ----------------------------------------------------------

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// Register handles POST /api/auth/register.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.Register(r.Context(), domains.RegisterRequest{
		Email:    req.Email,
		Password: req.Password,
		Name:     req.Name,
	})
	if err != nil {
		writeRegisterError(w, err)
		return
	}

	setTokenCookies(w, r, res.AccessToken, res.RefreshToken)
	writeJSON(w, http.StatusCreated, res.User)
}

// writeRegisterError handles the specific error cases for registration,
// including DB unique violations (duplicate email), before falling through
// to the shared writeUsecaseError for everything else.
func writeRegisterError(w http.ResponseWriter, err error) {
	msg := err.Error()
	// Catch DB-level unique constraint violations on email.
	if containsAny(msg, "already in use", "duplicate", "unique") {
		writeJSON(w, http.StatusConflict, errBody("email already in use"))
		return
	}
	// Validation errors returned as plain fmt.Errorf strings.
	if containsAny(msg, "required", "at least", "invalid") {
		writeJSON(w, http.StatusBadRequest, errBody(msg))
		return
	}
	writeUsecaseError(w, err)
}

// containsAny reports whether s contains any of the given substrings.
func containsAny(s string, substrings ...string) bool {
	for _, sub := range substrings {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}

// --- Login -------------------------------------------------------------

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login handles POST /api/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.Login(r.Context(), domains.LoginRequest{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		// ErrInvalidCredentials is handled by the shared writeUsecaseError.
		writeUsecaseError(w, err)
		return
	}

	setTokenCookies(w, r, res.AccessToken, res.RefreshToken)
	writeJSON(w, http.StatusOK, res.User)
}

// --- Refresh -----------------------------------------------------------

// Refresh handles POST /api/auth/refresh.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errBody("missing refresh token"))
		return
	}

	res, err := h.usecase.Refresh(r.Context(), domains.RefreshRequest{
		RawRefreshToken: cookie.Value,
	})
	if err != nil {
		// SEC-03: do not expose internal error details to the client.
		pkgcookie.ClearTokenCookies(w, r)
		writeJSON(w, http.StatusUnauthorized, errBody("token refresh failed"))
		return
	}

	setTokenCookies(w, r, res.AccessToken, res.RefreshToken)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- Logout ------------------------------------------------------------

// Logout handles POST /api/auth/logout.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	rawRefreshToken := ""
	if cookie, err := r.Cookie("refresh_token"); err == nil {
		rawRefreshToken = cookie.Value
	}

	// Best-effort revocation — we clear cookies regardless of outcome.
	_ = h.usecase.Logout(r.Context(), domains.LogoutRequest{
		RawRefreshToken: rawRefreshToken,
	})

	pkgcookie.ClearTokenCookies(w, r)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- GetUser -----------------------------------------------------------

// GetUser handles GET /api/auth/me. Requires the Authenticate middleware.
func (h *AuthHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// --- helpers -----------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body) //nolint:errcheck
}

func errBody(msg string) map[string]string {
	return map[string]string{"error": msg}
}

func setTokenCookies(w http.ResponseWriter, r *http.Request, accessToken, refreshToken string) {
	pkgcookie.SetTokenCookie(w, r, "access_token", accessToken, auth.AccessTokenTTL)
	pkgcookie.SetTokenCookie(w, r, "refresh_token", refreshToken, auth.RefreshTokenTTL)
}
