package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// teamRepository is the concrete PostgreSQL implementation of domains.TeamRepository.
type teamRepository struct {
	db *sql.DB
}

// NewTeamRepository constructs a TeamRepository backed by the given *sql.DB.
func NewTeamRepository(db *sql.DB) domains.TeamRepository {
	return &teamRepository{db: db}
}

// CreateTeam inserts a new team and adds the creator as coach in team_members,
// both within a single transaction.
func (r *teamRepository) CreateTeam(ctx context.Context, req domains.CreateTeamRequest) (domains.CreateTeamResponse, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domains.CreateTeamResponse{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // rolled back on error paths; committed on success

	team, err := insertTeam(ctx, tx, req)
	if err != nil {
		return domains.CreateTeamResponse{}, err
	}

	_, err = insertMember(ctx, tx, domains.AddMemberRequest{
		TeamID: team.ID,
		UserID: req.CoachID,
		Role:   "coach",
	})
	if err != nil {
		return domains.CreateTeamResponse{}, err
	}

	if err := tx.Commit(); err != nil {
		return domains.CreateTeamResponse{}, fmt.Errorf("commit transaction: %w", err)
	}

	return domains.CreateTeamResponse{Team: team}, nil
}

// insertTeam executes the INSERT into teams within a transaction.
func insertTeam(ctx context.Context, tx *sql.Tx, req domains.CreateTeamRequest) (*models.Team, error) {
	const q = `
		INSERT INTO teams (name, sport, coach_id)
		VALUES ($1, $2, $3)
		RETURNING id, name, sport, coach_id, logo_url, created_at`

	t := &models.Team{}
	err := tx.QueryRowContext(ctx, q, req.Name, req.Sport, req.CoachID).Scan(
		&t.ID,
		&t.Name,
		&t.Sport,
		&t.CoachID,
		&t.LogoURL,
		&t.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert team: %w", err)
	}
	return t, nil
}

// insertMember executes the INSERT into team_members within a transaction.
func insertMember(ctx context.Context, tx *sql.Tx, req domains.AddMemberRequest) (*models.TeamMember, error) {
	const q = `
		INSERT INTO team_members (team_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING id, team_id, user_id, role, jersey_number, position, joined_at`

	m := &models.TeamMember{}
	err := tx.QueryRowContext(ctx, q, req.TeamID, req.UserID, req.Role).Scan(
		&m.ID,
		&m.TeamID,
		&m.UserID,
		&m.Role,
		&m.JerseyNumber,
		&m.Position,
		&m.JoinedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert team member: %w", err)
	}
	return m, nil
}

// GetTeam returns the team matching teamID, or ErrNotFound.
func (r *teamRepository) GetTeam(ctx context.Context, req domains.GetTeamRequest) (domains.GetTeamResponse, error) {
	const q = `
		SELECT id, name, sport, coach_id, logo_url, created_at
		FROM teams
		WHERE id = $1`

	t := &models.Team{}
	err := r.db.QueryRowContext(ctx, q, req.TeamID).Scan(
		&t.ID,
		&t.Name,
		&t.Sport,
		&t.CoachID,
		&t.LogoURL,
		&t.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetTeamResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetTeamResponse{}, fmt.Errorf("get team: %w", err)
	}
	return domains.GetTeamResponse{Team: t}, nil
}

// ListTeams returns all teams the given user belongs to via team_members.
func (r *teamRepository) ListTeams(ctx context.Context, req domains.ListTeamsRequest) (domains.ListTeamsResponse, error) {
	const q = `
		SELECT t.id, t.name, t.sport, t.coach_id, t.logo_url, t.created_at
		FROM teams t
		JOIN team_members tm ON tm.team_id = t.id
		WHERE tm.user_id = $1
		ORDER BY t.created_at DESC`

	rows, err := r.db.QueryContext(ctx, q, req.UserID)
	if err != nil {
		return domains.ListTeamsResponse{}, fmt.Errorf("list teams: %w", err)
	}
	defer rows.Close()

	var teams []*models.Team
	for rows.Next() {
		t := &models.Team{}
		if err := rows.Scan(
			&t.ID,
			&t.Name,
			&t.Sport,
			&t.CoachID,
			&t.LogoURL,
			&t.CreatedAt,
		); err != nil {
			return domains.ListTeamsResponse{}, fmt.Errorf("scan team row: %w", err)
		}
		teams = append(teams, t)
	}
	if err := rows.Err(); err != nil {
		return domains.ListTeamsResponse{}, fmt.Errorf("list teams rows: %w", err)
	}

	if teams == nil {
		teams = []*models.Team{}
	}
	return domains.ListTeamsResponse{Teams: teams}, nil
}

// UpdateTeam applies non-nil field updates to the team and returns the updated record.
func (r *teamRepository) UpdateTeam(ctx context.Context, req domains.UpdateTeamRequest) (domains.UpdateTeamResponse, error) {
	const q = `
		UPDATE teams
		SET
			name     = COALESCE($1, name),
			logo_url = COALESCE($2, logo_url)
		WHERE id = $3
		RETURNING id, name, sport, coach_id, logo_url, created_at`

	t := &models.Team{}
	err := r.db.QueryRowContext(ctx, q, req.Name, req.LogoURL, req.TeamID).Scan(
		&t.ID,
		&t.Name,
		&t.Sport,
		&t.CoachID,
		&t.LogoURL,
		&t.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.UpdateTeamResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.UpdateTeamResponse{}, fmt.Errorf("update team: %w", err)
	}
	return domains.UpdateTeamResponse{Team: t}, nil
}

// DeleteTeam removes a team by ID. Cascade delete handles team_members rows.
func (r *teamRepository) DeleteTeam(ctx context.Context, req domains.DeleteTeamRequest) (domains.DeleteTeamResponse, error) {
	const q = `DELETE FROM teams WHERE id = $1`
	result, err := r.db.ExecContext(ctx, q, req.TeamID)
	if err != nil {
		return domains.DeleteTeamResponse{}, fmt.Errorf("delete team: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return domains.DeleteTeamResponse{}, fmt.Errorf("delete team rows affected: %w", err)
	}
	if n == 0 {
		return domains.DeleteTeamResponse{}, ErrNotFound
	}
	return domains.DeleteTeamResponse{}, nil
}

// GetMembership returns a single team_members row for the given team+user pair,
// or ErrNotFound if no membership exists.
func (r *teamRepository) GetMembership(ctx context.Context, req domains.GetMembershipRequest) (domains.GetMembershipResponse, error) {
	const q = `
		SELECT id, team_id, user_id, role, jersey_number, position, joined_at
		FROM team_members
		WHERE team_id = $1 AND user_id = $2`

	m := &models.TeamMember{}
	err := r.db.QueryRowContext(ctx, q, req.TeamID, req.UserID).Scan(
		&m.ID,
		&m.TeamID,
		&m.UserID,
		&m.Role,
		&m.JerseyNumber,
		&m.Position,
		&m.JoinedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetMembershipResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetMembershipResponse{}, fmt.Errorf("get membership: %w", err)
	}
	return domains.GetMembershipResponse{Member: m}, nil
}

// ListMembers returns all members of a team joined with their user record.
func (r *teamRepository) ListMembers(ctx context.Context, req domains.ListMembersRequest) (domains.ListMembersResponse, error) {
	const q = `
		SELECT
			tm.id, tm.team_id, tm.user_id, tm.role, tm.jersey_number, tm.position, tm.joined_at,
			u.id, u.email, u.name, u.avatar_url, u.created_at
		FROM team_members tm
		JOIN users u ON u.id = tm.user_id
		WHERE tm.team_id = $1
		ORDER BY tm.joined_at ASC`

	rows, err := r.db.QueryContext(ctx, q, req.TeamID)
	if err != nil {
		return domains.ListMembersResponse{}, fmt.Errorf("list members: %w", err)
	}
	defer rows.Close()

	var members []domains.MemberWithUser
	for rows.Next() {
		var mwu domains.MemberWithUser
		if err := rows.Scan(
			&mwu.Member.ID,
			&mwu.Member.TeamID,
			&mwu.Member.UserID,
			&mwu.Member.Role,
			&mwu.Member.JerseyNumber,
			&mwu.Member.Position,
			&mwu.Member.JoinedAt,
			&mwu.User.ID,
			&mwu.User.Email,
			&mwu.User.Name,
			&mwu.User.AvatarURL,
			&mwu.User.CreatedAt,
		); err != nil {
			return domains.ListMembersResponse{}, fmt.Errorf("scan member row: %w", err)
		}
		members = append(members, mwu)
	}
	if err := rows.Err(); err != nil {
		return domains.ListMembersResponse{}, fmt.Errorf("list members rows: %w", err)
	}

	if members == nil {
		members = []domains.MemberWithUser{}
	}
	return domains.ListMembersResponse{Members: members}, nil
}
