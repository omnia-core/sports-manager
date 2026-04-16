package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/middleware"
)

type GameHandler struct {
	usecase domains.GameUsecase
}

func NewGameHandler(uc domains.GameUsecase) *GameHandler {
	return &GameHandler{usecase: uc}
}

// ListGames handles GET /api/teams/:teamID/games.
func (h *GameHandler) ListGames(w http.ResponseWriter, r *http.Request) {
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
	res, err := h.usecase.ListGames(r.Context(), domains.ListGamesRequest{TeamID: teamID, CallerID: caller.ID})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"games": res.Games})
}

type createGameBody struct {
	OpponentName string `json:"opponent_name"`
	GameDate     string `json:"game_date"` // "YYYY-MM-DD"
}

// CreateGame handles POST /api/teams/:teamID/games.
func (h *GameHandler) CreateGame(w http.ResponseWriter, r *http.Request) {
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
	var body createGameBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}
	gameDate, err := time.Parse("2006-01-02", body.GameDate)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("game_date must be YYYY-MM-DD"))
		return
	}
	res, err := h.usecase.CreateGame(r.Context(), domains.CreateGameRequest{
		TeamID:       teamID,
		CallerID:     caller.ID,
		OpponentName: body.OpponentName,
		GameDate:     gameDate,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, res.Game)
}

// GetGameDetail handles GET /api/games/:gameID.
func (h *GameHandler) GetGameDetail(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}
	gameID, err := parseUUIDParam(r, "gameID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid game ID"))
		return
	}
	res, err := h.usecase.GetGameDetail(r.Context(), domains.GetGameDetailRequest{GameID: gameID, CallerID: caller.ID})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

type updateGameBody struct {
	OpponentName  *string `json:"opponent_name"`
	GameDate      *string `json:"game_date"`
	TeamScore     *int    `json:"team_score"`
	OpponentScore *int    `json:"opponent_score"`
}

// UpdateGame handles PUT /api/games/:gameID.
func (h *GameHandler) UpdateGame(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}
	gameID, err := parseUUIDParam(r, "gameID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid game ID"))
		return
	}
	var body updateGameBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}
	req := domains.UpdateGameRequest{
		GameID:        gameID,
		CallerID:      caller.ID,
		OpponentName:  body.OpponentName,
		TeamScore:     body.TeamScore,
		OpponentScore: body.OpponentScore,
	}
	if body.GameDate != nil {
		d, err := time.Parse("2006-01-02", *body.GameDate)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errBody("game_date must be YYYY-MM-DD"))
			return
		}
		req.GameDate = &d
	}
	res, err := h.usecase.UpdateGame(r.Context(), req)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res.Game)
}

// DeleteGame handles DELETE /api/games/:gameID.
func (h *GameHandler) DeleteGame(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}
	gameID, err := parseUUIDParam(r, "gameID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid game ID"))
		return
	}
	if _, err := h.usecase.DeleteGame(r.Context(), domains.DeleteGameRequest{GameID: gameID, CallerID: caller.ID}); err != nil {
		writeUsecaseError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type upsertStatsBody struct {
	Mins      int `json:"mins"`
	Pts       int `json:"pts"`
	FGM       int `json:"fgm"`
	FGA       int `json:"fga"`
	ThreePM   int `json:"three_pm"`
	ThreePA   int `json:"three_pa"`
	FTM       int `json:"ftm"`
	FTA       int `json:"fta"`
	ORB       int `json:"orb"`
	DRB       int `json:"drb"`
	AST       int `json:"ast"`
	STL       int `json:"stl"`
	BLK       int `json:"blk"`
	TOV       int `json:"tov"`
	PF        int `json:"pf"`
	PlusMinus int `json:"plus_minus"`
}

// UpsertStats handles PUT /api/games/:gameID/stats/:userID.
func (h *GameHandler) UpsertStats(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}
	gameID, err := parseUUIDParam(r, "gameID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid game ID"))
		return
	}
	memberID, err := parseUUIDParam(r, "memberID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid member ID"))
		return
	}
	var body upsertStatsBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid request body"))
		return
	}
	res, err := h.usecase.UpsertStats(r.Context(), domains.UpsertStatsRequest{
		GameID: gameID, MemberID: memberID, CallerID: caller.ID,
		Mins: body.Mins, Pts: body.Pts, FGM: body.FGM, FGA: body.FGA,
		ThreePM: body.ThreePM, ThreePA: body.ThreePA,
		FTM: body.FTM, FTA: body.FTA, ORB: body.ORB, DRB: body.DRB,
		AST: body.AST, STL: body.STL, BLK: body.BLK, TOV: body.TOV,
		PF: body.PF, PlusMinus: body.PlusMinus,
	})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res.Stats)
}

// ToggleDNP handles PATCH /api/games/:gameID/players/:userID.
func (h *GameHandler) ToggleDNP(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errBody("not authenticated"))
		return
	}
	gameID, err := parseUUIDParam(r, "gameID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid game ID"))
		return
	}
	memberID, err := parseUUIDParam(r, "memberID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errBody("invalid member ID"))
		return
	}
	res, err := h.usecase.ToggleDNP(r.Context(), domains.ToggleDNPRequest{GameID: gameID, MemberID: memberID, CallerID: caller.ID})
	if err != nil {
		writeUsecaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}
