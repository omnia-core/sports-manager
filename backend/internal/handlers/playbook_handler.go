package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/middleware"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// PlaybookHandler handles all playbook and play HTTP endpoints.
type PlaybookHandler struct {
	usecase domains.PlaybookUsecase
}

// NewPlaybookHandler constructs a PlaybookHandler.
func NewPlaybookHandler(uc domains.PlaybookUsecase) *PlaybookHandler {
	return &PlaybookHandler{usecase: uc}
}

// ----------------------------------------------------------------------------
// Playbook handlers
// ----------------------------------------------------------------------------

// ListPlaybooks handles GET /api/teams/:teamID/playbooks.
func (h *PlaybookHandler) ListPlaybooks(w http.ResponseWriter, r *http.Request) {
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

	res, err := h.usecase.ListPlaybooks(r.Context(), domains.ListPlaybooksRequest{
		TeamID:   teamID,
		CallerID: caller.ID,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	playbooks := res.Playbooks
	if playbooks == nil {
		playbooks = make([]*models.Playbook, 0)
	}
	writeJSON(w, http.StatusOK, map[string]any{"playbooks": playbooks})
}

type createPlaybookRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

// CreatePlaybook handles POST /api/teams/:teamID/playbooks.
func (h *PlaybookHandler) CreatePlaybook(w http.ResponseWriter, r *http.Request) {
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

	var body createPlaybookRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.CreatePlaybook(r.Context(), domains.CreatePlaybookRequest{
		TeamID:      teamID,
		CallerID:    caller.ID,
		Name:        body.Name,
		Description: body.Description,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, res.Playbook)
}

// GetPlaybook handles GET /api/playbooks/:playbookID.
func (h *PlaybookHandler) GetPlaybook(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	playbookID, err := parseUUIDParam(r, "playbookID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid playbook ID"))
		return
	}

	res, err := h.usecase.GetPlaybook(r.Context(), domains.GetPlaybookRequest{
		PlaybookID: playbookID,
		CallerID:   caller.ID,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, res.Playbook)
}

type updatePlaybookRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

// UpdatePlaybook handles PUT /api/playbooks/:playbookID.
func (h *PlaybookHandler) UpdatePlaybook(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	playbookID, err := parseUUIDParam(r, "playbookID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid playbook ID"))
		return
	}

	var body updatePlaybookRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.UpdatePlaybook(r.Context(), domains.UpdatePlaybookRequest{
		PlaybookID:  playbookID,
		CallerID:    caller.ID,
		Name:        body.Name,
		Description: body.Description,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, res.Playbook)
}

// DeletePlaybook handles DELETE /api/playbooks/:playbookID.
func (h *PlaybookHandler) DeletePlaybook(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	playbookID, err := parseUUIDParam(r, "playbookID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid playbook ID"))
		return
	}

	_, err = h.usecase.DeletePlaybook(r.Context(), domains.DeletePlaybookRequest{
		PlaybookID: playbookID,
		CallerID:   caller.ID,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ----------------------------------------------------------------------------
// Play handlers
// ----------------------------------------------------------------------------

// ListPlays handles GET /api/playbooks/:playbookID/plays.
func (h *PlaybookHandler) ListPlays(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	playbookID, err := parseUUIDParam(r, "playbookID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid playbook ID"))
		return
	}

	res, err := h.usecase.ListPlays(r.Context(), domains.ListPlaysRequest{
		PlaybookID: playbookID,
		CallerID:   caller.ID,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	plays := res.Plays
	if plays == nil {
		plays = make([]*models.Play, 0)
	}
	writeJSON(w, http.StatusOK, map[string]any{"plays": plays})
}

type createPlayRequest struct {
	Name        string           `json:"name"`
	Category    string           `json:"category"`
	Description *string          `json:"description"`
	DiagramJSON *json.RawMessage `json:"diagram_json"`
}

// CreatePlay handles POST /api/playbooks/:playbookID/plays.
func (h *PlaybookHandler) CreatePlay(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	playbookID, err := parseUUIDParam(r, "playbookID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid playbook ID"))
		return
	}

	var body createPlayRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.CreatePlay(r.Context(), domains.CreatePlayRequest{
		PlaybookID:  playbookID,
		CallerID:    caller.ID,
		Name:        body.Name,
		Category:    body.Category,
		Description: body.Description,
		DiagramJSON: body.DiagramJSON,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, res.Play)
}

// GetPlay handles GET /api/plays/:playID.
func (h *PlaybookHandler) GetPlay(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	playID, err := parseUUIDParam(r, "playID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid play ID"))
		return
	}

	res, err := h.usecase.GetPlay(r.Context(), domains.GetPlayRequest{
		PlayID:   playID,
		CallerID: caller.ID,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, res.Play)
}

type updatePlayRequest struct {
	Name        *string          `json:"name"`
	Category    *string          `json:"category"`
	Description *string          `json:"description"`
	DiagramJSON *json.RawMessage `json:"diagram_json"`
}

// UpdatePlay handles PUT /api/plays/:playID.
func (h *PlaybookHandler) UpdatePlay(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	playID, err := parseUUIDParam(r, "playID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid play ID"))
		return
	}

	var body updatePlayRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}

	res, err := h.usecase.UpdatePlay(r.Context(), domains.UpdatePlayRequest{
		PlayID:      playID,
		CallerID:    caller.ID,
		Name:        body.Name,
		Category:    body.Category,
		Description: body.Description,
		DiagramJSON: body.DiagramJSON,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, res.Play)
}

// DeletePlay handles DELETE /api/plays/:playID.
func (h *PlaybookHandler) DeletePlay(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}

	playID, err := parseUUIDParam(r, "playID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid play ID"))
		return
	}

	_, err = h.usecase.DeletePlay(r.Context(), domains.DeletePlayRequest{
		PlayID:   playID,
		CallerID: caller.ID,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// parseUUIDParam is defined in team_handler.go and is available throughout
// this package — no redeclaration needed here.
