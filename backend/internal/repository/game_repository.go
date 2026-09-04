package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

type gameRepository struct {
	db *sql.DB
}

func NewGameRepository(db *sql.DB) domains.GameRepository {
	return &gameRepository{db: db}
}

// teamScoreExpr derives a game's own score from its box score, counting only
// players who are not marked DNP. Correlated on the alias `g` for games.
//
// The score is derived rather than stored: a stored copy stopped moving once
// written, so a later stat correction left the header disagreeing with the box
// score directly beneath it.
const teamScoreExpr = `(SELECT COALESCE(SUM(gs.pts), 0)
		  FROM game_players gp
		  JOIN game_stats gs ON gs.game_player_id = gp.id
		 WHERE gp.game_id = g.id AND NOT gp.is_dnp)`

func (r *gameRepository) CreateGame(ctx context.Context, req domains.CreateGameRequest) (domains.CreateGameResponse, error) {
	// A game has no stats at creation, so its derived score is 0.
	const q = `
		INSERT INTO games (team_id, opponent_name, game_date)
		VALUES ($1, $2, $3)
		RETURNING id, team_id, opponent_name, game_date, 0, opponent_score, created_at`
	g := &models.Game{}
	err := r.db.QueryRowContext(ctx, q, req.TeamID, req.OpponentName, req.GameDate).Scan(
		&g.ID, &g.TeamID, &g.OpponentName, &g.GameDate, &g.TeamScore, &g.OpponentScore, &g.CreatedAt,
	)
	if err != nil {
		return domains.CreateGameResponse{}, fmt.Errorf("create game: %w", err)
	}
	return domains.CreateGameResponse{Game: g}, nil
}

func (r *gameRepository) SeedGamePlayers(ctx context.Context, req domains.SeedGamePlayersRequest) (domains.SeedGamePlayersResponse, error) {
	const q = `
		INSERT INTO game_players (game_id, team_member_id, user_id)
		SELECT $1, tm.id, tm.user_id
		FROM team_members tm
		WHERE tm.id = $2
		ON CONFLICT (game_id, team_member_id) DO NOTHING`
	for _, mid := range req.MemberIDs {
		if _, err := r.db.ExecContext(ctx, q, req.GameID, mid); err != nil {
			return domains.SeedGamePlayersResponse{}, fmt.Errorf("seed game player %s: %w", mid, err)
		}
	}
	return domains.SeedGamePlayersResponse{}, nil
}

func (r *gameRepository) GetGame(ctx context.Context, req domains.GetGameRequest) (domains.GetGameResponse, error) {
	const q = `
		SELECT g.id, g.team_id, g.opponent_name, g.game_date, ` + teamScoreExpr + `, g.opponent_score, g.created_at
		FROM games g WHERE g.id = $1`
	g := &models.Game{}
	err := r.db.QueryRowContext(ctx, q, req.GameID).Scan(
		&g.ID, &g.TeamID, &g.OpponentName, &g.GameDate, &g.TeamScore, &g.OpponentScore, &g.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetGameResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetGameResponse{}, fmt.Errorf("get game: %w", err)
	}
	return domains.GetGameResponse{Game: g}, nil
}

func (r *gameRepository) ListGames(ctx context.Context, req domains.ListGamesRequest) (domains.ListGamesResponse, error) {
	const q = `
		SELECT g.id, g.team_id, g.opponent_name, g.game_date, ` + teamScoreExpr + `, g.opponent_score, g.created_at
		FROM games g WHERE g.team_id = $1 ORDER BY g.game_date DESC, g.created_at DESC`
	rows, err := r.db.QueryContext(ctx, q, req.TeamID)
	if err != nil {
		return domains.ListGamesResponse{}, fmt.Errorf("list games: %w", err)
	}
	defer rows.Close()

	var games []*models.Game
	for rows.Next() {
		g := &models.Game{}
		if err := rows.Scan(&g.ID, &g.TeamID, &g.OpponentName, &g.GameDate, &g.TeamScore, &g.OpponentScore, &g.CreatedAt); err != nil {
			return domains.ListGamesResponse{}, fmt.Errorf("scan game: %w", err)
		}
		games = append(games, g)
	}
	if err := rows.Err(); err != nil {
		return domains.ListGamesResponse{}, fmt.Errorf("list games rows: %w", err)
	}
	if games == nil {
		games = []*models.Game{}
	}
	return domains.ListGamesResponse{Games: games}, nil
}

func (r *gameRepository) GetGameDetail(ctx context.Context, req domains.GetGameDetailRequest) (domains.GetGameDetailResponse, error) {
	// Fetch the game itself
	gameRes, err := r.GetGame(ctx, domains.GetGameRequest{GameID: req.GameID})
	if err != nil {
		return domains.GetGameDetailResponse{}, err
	}

	// Fetch players + stats via JOIN. Name comes from the user account when available,
	// otherwise from the team_members placeholder name.
	const q = `
		SELECT
			gp.team_member_id,
			gp.is_dnp,
			COALESCE(u.name, tm.name, '') AS name,
			tm.jersey_number,
			tm.position,
			gs.id,
			gs.game_player_id,
			gs.mins, gs.pts, gs.fgm, gs.fga,
			gs.three_pm, gs.three_pa,
			gs.ftm, gs.fta,
			gs.orb, gs.drb,
			gs.ast, gs.stl, gs.blk, gs.tov, gs.pf, gs.plus_minus
		FROM game_players gp
		JOIN team_members tm ON tm.id = gp.team_member_id
		LEFT JOIN users u ON u.id = tm.user_id
		LEFT JOIN game_stats gs ON gs.game_player_id = gp.id
		WHERE gp.game_id = $1
		ORDER BY gp.created_at ASC`

	rows, err := r.db.QueryContext(ctx, q, req.GameID)
	if err != nil {
		return domains.GetGameDetailResponse{}, fmt.Errorf("get game detail: %w", err)
	}
	defer rows.Close()

	var players []domains.GameDetailPlayer
	for rows.Next() {
		var p domains.GameDetailPlayer
		var statsID, statsGamePlayerID *uuid.UUID
		var mins, pts, fgm, fga, threePM, threePA, ftm, fta, orb, drb, ast, stl, blk, tov, pf, plusMinus *int
		if err := rows.Scan(
			&p.MemberID, &p.IsDNP, &p.Name, &p.JerseyNumber, &p.Position,
			&statsID, &statsGamePlayerID,
			&mins, &pts, &fgm, &fga, &threePM, &threePA,
			&ftm, &fta, &orb, &drb, &ast, &stl, &blk, &tov, &pf, &plusMinus,
		); err != nil {
			return domains.GetGameDetailResponse{}, fmt.Errorf("scan game detail row: %w", err)
		}
		if statsID != nil {
			p.Stats = &models.GameStats{
				ID: *statsID, GamePlayerID: *statsGamePlayerID,
				Mins: *mins, Pts: *pts, FGM: *fgm, FGA: *fga,
				ThreePM: *threePM, ThreePA: *threePA,
				FTM: *ftm, FTA: *fta, ORB: *orb, DRB: *drb,
				AST: *ast, STL: *stl, BLK: *blk, TOV: *tov, PF: *pf, PlusMinus: *plusMinus,
			}
		}
		players = append(players, p)
	}
	if err := rows.Err(); err != nil {
		return domains.GetGameDetailResponse{}, fmt.Errorf("game detail rows: %w", err)
	}
	if players == nil {
		players = []domains.GameDetailPlayer{}
	}
	return domains.GetGameDetailResponse{Game: gameRes.Game, Players: players}, nil
}

func (r *gameRepository) UpdateGame(ctx context.Context, req domains.UpdateGameRequest) (domains.UpdateGameResponse, error) {
	// The update runs in a CTE so the returned row can carry the derived team
	// score, which a bare UPDATE ... RETURNING cannot correlate.
	const q = `
		WITH upd AS (
			UPDATE games SET
				opponent_name  = COALESCE($1, opponent_name),
				game_date      = COALESCE($2, game_date),
				opponent_score = COALESCE($3, opponent_score)
			WHERE id = $4
			RETURNING id, team_id, opponent_name, game_date, opponent_score, created_at
		)
		SELECT g.id, g.team_id, g.opponent_name, g.game_date, ` + teamScoreExpr + `, g.opponent_score, g.created_at
		FROM upd g`
	g := &models.Game{}
	err := r.db.QueryRowContext(ctx, q,
		req.OpponentName, req.GameDate, req.OpponentScore, req.GameID,
	).Scan(&g.ID, &g.TeamID, &g.OpponentName, &g.GameDate, &g.TeamScore, &g.OpponentScore, &g.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.UpdateGameResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.UpdateGameResponse{}, fmt.Errorf("update game: %w", err)
	}
	return domains.UpdateGameResponse{Game: g}, nil
}

func (r *gameRepository) DeleteGame(ctx context.Context, req domains.DeleteGameRequest) (domains.DeleteGameResponse, error) {
	result, err := r.db.ExecContext(ctx, `DELETE FROM games WHERE id = $1`, req.GameID)
	if err != nil {
		return domains.DeleteGameResponse{}, fmt.Errorf("delete game: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return domains.DeleteGameResponse{}, fmt.Errorf("delete game rows affected: %w", err)
	}
	if n == 0 {
		return domains.DeleteGameResponse{}, ErrNotFound
	}
	return domains.DeleteGameResponse{}, nil
}

func (r *gameRepository) UpsertStats(ctx context.Context, req domains.UpsertStatsRequest) (domains.UpsertStatsResponse, error) {
	const q = `
		INSERT INTO game_stats (game_player_id, mins, pts, fgm, fga, three_pm, three_pa, ftm, fta, orb, drb, ast, stl, blk, tov, pf, plus_minus)
		SELECT gp.id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		FROM game_players gp
		WHERE gp.game_id = $1 AND gp.team_member_id = $2
		ON CONFLICT (game_player_id) DO UPDATE SET
			mins = EXCLUDED.mins, pts = EXCLUDED.pts,
			fgm = EXCLUDED.fgm, fga = EXCLUDED.fga,
			three_pm = EXCLUDED.three_pm, three_pa = EXCLUDED.three_pa,
			ftm = EXCLUDED.ftm, fta = EXCLUDED.fta,
			orb = EXCLUDED.orb, drb = EXCLUDED.drb,
			ast = EXCLUDED.ast, stl = EXCLUDED.stl,
			blk = EXCLUDED.blk, tov = EXCLUDED.tov,
			pf = EXCLUDED.pf, plus_minus = EXCLUDED.plus_minus
		RETURNING id, game_player_id, mins, pts, fgm, fga, three_pm, three_pa, ftm, fta, orb, drb, ast, stl, blk, tov, pf, plus_minus`

	s := &models.GameStats{}
	err := r.db.QueryRowContext(ctx, q,
		req.GameID, req.MemberID,
		req.Mins, req.Pts, req.FGM, req.FGA,
		req.ThreePM, req.ThreePA,
		req.FTM, req.FTA,
		req.ORB, req.DRB,
		req.AST, req.STL, req.BLK, req.TOV, req.PF, req.PlusMinus,
	).Scan(
		&s.ID, &s.GamePlayerID,
		&s.Mins, &s.Pts, &s.FGM, &s.FGA,
		&s.ThreePM, &s.ThreePA,
		&s.FTM, &s.FTA, &s.ORB, &s.DRB,
		&s.AST, &s.STL, &s.BLK, &s.TOV, &s.PF, &s.PlusMinus,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.UpsertStatsResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.UpsertStatsResponse{}, fmt.Errorf("upsert stats: %w", err)
	}
	return domains.UpsertStatsResponse{Stats: s}, nil
}

func (r *gameRepository) ToggleDNP(ctx context.Context, req domains.ToggleDNPRequest) (domains.ToggleDNPResponse, error) {
	var isDNP bool
	err := r.db.QueryRowContext(ctx,
		`UPDATE game_players SET is_dnp = NOT is_dnp WHERE game_id = $1 AND team_member_id = $2 RETURNING is_dnp`,
		req.GameID, req.MemberID,
	).Scan(&isDNP)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.ToggleDNPResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.ToggleDNPResponse{}, fmt.Errorf("toggle dnp: %w", err)
	}
	return domains.ToggleDNPResponse{IsDNP: isDNP}, nil
}
