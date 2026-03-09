package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

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
		writeUsecaseError(w, err)
		return
	}

	setTokenCookies(w, r, res.AccessToken, res.RefreshToken)
	writeJSON(w, http.StatusCreated, res.User)
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
		// "invalid credentials" maps to 401; everything else is 500.
		if strings.Contains(err.Error(), "invalid credentials") {
			writeJSON(w, http.StatusUnauthorized, errBody(err.Error()))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errBody("login failed"))
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
		pkgcookie.ClearTokenCookies(w, r)
		writeJSON(w, http.StatusUnauthorized, errBody(err.Error()))
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

// writeUsecaseError maps known usecase error strings to appropriate HTTP status codes.
func writeUsecaseError(w http.ResponseWriter, err error) {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "already in use"),
		strings.Contains(msg, "duplicate"),
		strings.Contains(msg, "unique"):
		writeJSON(w, http.StatusConflict, errBody("email already in use"))
	case strings.Contains(msg, "required"),
		strings.Contains(msg, "at least"):
		writeJSON(w, http.StatusBadRequest, errBody(msg))
	default:
		writeJSON(w, http.StatusInternalServerError, errBody("an error occurred"))
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func errBody(msg string) map[string]string {
	return map[string]string{"error": msg}
}

func setTokenCookies(w http.ResponseWriter, r *http.Request, accessToken, refreshToken string) {
	pkgcookie.SetTokenCookie(w, r, "access_token", accessToken, auth.AccessTokenTTL)
	pkgcookie.SetTokenCookie(w, r, "refresh_token", refreshToken, auth.RefreshTokenTTL)
}
