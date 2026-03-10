package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/middleware"
)

// InviteHandler handles invite HTTP endpoints.
type InviteHandler struct {
	usecase domains.InviteUsecase
}

// NewInviteHandler constructs an InviteHandler.
func NewInviteHandler(uc domains.InviteUsecase) *InviteHandler {
	return &InviteHandler{usecase: uc}
}

// --- CreateInvite ------------------------------------------------------

type createInviteRequest struct {
	Email string `json:"email"`
}

// CreateInvite handles POST /api/teams/:teamID/members.
// Requires authentication; coach-only enforcement is in the usecase.
func (h *InviteHandler) CreateInvite(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	teamID, err := parseUUIDParam(r, "teamID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid team ID"))
		return
	}

	var body createInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.CreateInvite(r.Context(), domains.CreateInviteRequest{
		TeamID:   teamID,
		CallerID: caller.ID,
		Email:    body.Email,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, res.Invite)
}

// --- AcceptInvite ------------------------------------------------------

// AcceptInvite handles POST /api/invites/:token/accept.
// Requires authentication — the user must be logged in to accept.
func (h *InviteHandler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	rawToken := chi.URLParam(r, "token")
	token, err := uuid.Parse(rawToken)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid invite token"))
		return
	}

	res, err := h.usecase.AcceptInvite(r.Context(), domains.AcceptInviteRequest{
		Token:  token,
		UserID: caller.ID,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, res.Member)
}
