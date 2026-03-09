package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/middleware"
	"github.com/omnia-core/sports-manager/backend/internal/repository"
	"github.com/omnia-core/sports-manager/backend/internal/usecase"
)

// TeamHandler handles all team HTTP endpoints.
type TeamHandler struct {
	usecase domains.TeamUsecase
}

// NewTeamHandler constructs a TeamHandler.
func NewTeamHandler(uc domains.TeamUsecase) *TeamHandler {
	return &TeamHandler{usecase: uc}
}

// --- ListTeams ---------------------------------------------------------

// ListTeams handles GET /api/teams.
func (h *TeamHandler) ListTeams(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	res, err := h.usecase.ListTeams(r.Context(), domains.ListTeamsRequest{
		UserID: caller.ID,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errBody("failed to list teams"))
		return
	}

	writeJSON(w, http.StatusOK, res.Teams)
}

// --- CreateTeam --------------------------------------------------------

type createTeamRequest struct {
	Name  string `json:"name"`
	Sport string `json:"sport"`
}

// CreateTeam handles POST /api/teams.
func (h *TeamHandler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	var body createTeamRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.CreateTeam(r.Context(), domains.CreateTeamRequest{
		Name:    body.Name,
		Sport:   body.Sport,
		CoachID: caller.ID,
	})
	if err != nil {
		writeTeamUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, res.Team)
}

// --- GetTeam -----------------------------------------------------------

// GetTeam handles GET /api/teams/:teamID.
func (h *TeamHandler) GetTeam(w http.ResponseWriter, r *http.Request) {
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

	res, err := h.usecase.GetTeam(r.Context(), domains.GetTeamRequest{
		TeamID:   teamID,
		CallerID: caller.ID,
	})
	if err != nil {
		writeTeamUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, res.Team)
}

// --- UpdateTeam --------------------------------------------------------

type updateTeamRequest struct {
	Name    *string `json:"name"`
	LogoURL *string `json:"logo_url"`
}

// UpdateTeam handles PUT /api/teams/:teamID.
func (h *TeamHandler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
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

	var body updateTeamRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.UpdateTeam(r.Context(), domains.UpdateTeamRequest{
		TeamID:   teamID,
		CallerID: caller.ID,
		Name:     body.Name,
		LogoURL:  body.LogoURL,
	})
	if err != nil {
		writeTeamUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, res.Team)
}

// --- DeleteTeam --------------------------------------------------------

// DeleteTeam handles DELETE /api/teams/:teamID.
func (h *TeamHandler) DeleteTeam(w http.ResponseWriter, r *http.Request) {
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

	_, err = h.usecase.DeleteTeam(r.Context(), domains.DeleteTeamRequest{
		TeamID:   teamID,
		CallerID: caller.ID,
	})
	if err != nil {
		writeTeamUsecaseError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- ListMembers -------------------------------------------------------

// ListMembers handles GET /api/teams/:teamID/members.
func (h *TeamHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
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

	res, err := h.usecase.ListMembers(r.Context(), domains.ListMembersRequest{
		TeamID:   teamID,
		CallerID: caller.ID,
	})
	if err != nil {
		writeTeamUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, res.Members)
}

// --- helpers -----------------------------------------------------------

// parseUUIDParam extracts and parses a named chi URL parameter as a UUID.
func parseUUIDParam(r *http.Request, param string) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, param))
}

// writeTeamUsecaseError maps team domain errors to appropriate HTTP status codes.
func writeTeamUsecaseError(w http.ResponseWriter, err error) {
	if errors.Is(err, usecase.ErrForbidden) {
		writeJSON(w, http.StatusForbidden, errBody("forbidden"))
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, errBody("not found"))
		return
	}
	if err.Error() == "team name is required" {
		writeJSON(w, http.StatusBadRequest, errBody(err.Error()))
		return
	}
	writeJSON(w, http.StatusInternalServerError, errBody("an error occurred"))
}
