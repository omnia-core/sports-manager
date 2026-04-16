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

// insertMember executes the INSERT into team_members with a required user_id (for coach creation).
func insertMember(ctx context.Context, tx *sql.Tx, req domains.AddMemberRequest) (*models.TeamMember, error) {
	const q = `
		INSERT INTO team_members (team_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING id, team_id, user_id, name, role, jersey_number, position, joined_at`

	m := &models.TeamMember{}
	err := tx.QueryRowContext(ctx, q, req.TeamID, req.UserID, req.Role).Scan(
		&m.ID,
		&m.TeamID,
		&m.UserID,
		&m.Name,
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

// RemoveMember deletes a team_members row by member ID. Coaches cannot be removed.
func (r *teamRepository) RemoveMember(ctx context.Context, req domains.RemoveMemberRequest) (domains.RemoveMemberResponse, error) {
	// Delete by member ID; the role != 'coach' guard prevents removing the coach.
	result, err := r.db.ExecContext(ctx,
		`DELETE FROM team_members WHERE id = $1 AND team_id = $2 AND role != 'coach'`,
		req.MemberID, req.TeamID,
	)
	if err != nil {
		return domains.RemoveMemberResponse{}, fmt.Errorf("remove member: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return domains.RemoveMemberResponse{}, fmt.Errorf("remove member rows affected: %w", err)
	}
	if n == 0 {
		return domains.RemoveMemberResponse{}, ErrNotFound
	}
	return domains.RemoveMemberResponse{}, nil
}

// GetMembership returns a single team_members row for the given team+user pair,
// or ErrNotFound if no membership exists.
func (r *teamRepository) GetMembership(ctx context.Context, req domains.GetMembershipRequest) (domains.GetMembershipResponse, error) {
	const q = `
		SELECT id, team_id, user_id, name, role, jersey_number, position, joined_at
		FROM team_members
		WHERE team_id = $1 AND user_id = $2`

	m := &models.TeamMember{}
	err := r.db.QueryRowContext(ctx, q, req.TeamID, req.UserID).Scan(
		&m.ID,
		&m.TeamID,
		&m.UserID,
		&m.Name,
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

// ListMembers returns all members of a team. Placeholder slots (user_id IS NULL) are included;
// their User pointer will be nil.
func (r *teamRepository) ListMembers(ctx context.Context, req domains.ListMembersRequest) (domains.ListMembersResponse, error) {
	const q = `
		SELECT
			tm.id, tm.team_id, tm.user_id, tm.name, tm.role, tm.jersey_number, tm.position, tm.joined_at,
			u.id, u.email, u.name, u.avatar_url, u.created_at
		FROM team_members tm
		LEFT JOIN users u ON u.id = tm.user_id
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
		// Nullable user columns — user row may not exist for placeholder slots.
		var (
			userID        sql.NullString
			userEmail     sql.NullString
			userName      sql.NullString
			userAvatarURL sql.NullString
			userCreatedAt sql.NullTime
		)
		if err := rows.Scan(
			&mwu.Member.ID,
			&mwu.Member.TeamID,
			&mwu.Member.UserID,
			&mwu.Member.Name,
			&mwu.Member.Role,
			&mwu.Member.JerseyNumber,
			&mwu.Member.Position,
			&mwu.Member.JoinedAt,
			&userID,
			&userEmail,
			&userName,
			&userAvatarURL,
			&userCreatedAt,
		); err != nil {
			return domains.ListMembersResponse{}, fmt.Errorf("scan member row: %w", err)
		}
		if userID.Valid {
			u := &models.User{
				Email:     userEmail.String,
				Name:      userName.String,
				CreatedAt: userCreatedAt.Time,
			}
			if err := u.ID.UnmarshalText([]byte(userID.String)); err != nil {
				return domains.ListMembersResponse{}, fmt.Errorf("parse user id: %w", err)
			}
			if userAvatarURL.Valid {
				u.AvatarURL = &userAvatarURL.String
			}
			mwu.User = u
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

// AddRosterMember inserts a placeholder team_members row with no user_id.
func (r *teamRepository) AddRosterMember(ctx context.Context, req domains.AddRosterMemberRequest) (domains.AddRosterMemberResponse, error) {
	const q = `
		INSERT INTO team_members (team_id, name, role, jersey_number, position)
		VALUES ($1, $2, 'player', $3, $4)
		RETURNING id, team_id, user_id, name, role, jersey_number, position, joined_at`

	m := &models.TeamMember{}
	err := r.db.QueryRowContext(ctx, q, req.TeamID, req.Name, req.JerseyNumber, req.Position).Scan(
		&m.ID,
		&m.TeamID,
		&m.UserID,
		&m.Name,
		&m.Role,
		&m.JerseyNumber,
		&m.Position,
		&m.JoinedAt,
	)
	if err != nil {
		return domains.AddRosterMemberResponse{}, fmt.Errorf("add roster member: %w", err)
	}
	return domains.AddRosterMemberResponse{Member: m}, nil
}

// UpdateMember updates jersey_number, position, and/or name for an existing roster slot.
func (r *teamRepository) UpdateMember(ctx context.Context, req domains.UpdateMemberRequest) (domains.UpdateMemberResponse, error) {
	const q = `
		UPDATE team_members
		SET
			jersey_number = COALESCE($1, jersey_number),
			position      = COALESCE($2, position),
			name          = COALESCE($3, name)
		WHERE id = $4 AND team_id = $5
		RETURNING id, team_id, user_id, name, role, jersey_number, position, joined_at`

	m := &models.TeamMember{}
	err := r.db.QueryRowContext(ctx, q, req.JerseyNumber, req.Position, req.Name, req.MemberID, req.TeamID).Scan(
		&m.ID,
		&m.TeamID,
		&m.UserID,
		&m.Name,
		&m.Role,
		&m.JerseyNumber,
		&m.Position,
		&m.JoinedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.UpdateMemberResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.UpdateMemberResponse{}, fmt.Errorf("update member: %w", err)
	}
	return domains.UpdateMemberResponse{Member: m}, nil
}
