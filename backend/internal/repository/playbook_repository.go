package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/omnia-core/sports-manager/backend/internal/domains"
	"github.com/omnia-core/sports-manager/backend/internal/models"
)

// playbookRepository is the concrete PostgreSQL implementation of domains.PlaybookRepository.
type playbookRepository struct {
	db *sql.DB
}

// NewPlaybookRepository constructs a PlaybookRepository backed by the given *sql.DB.
func NewPlaybookRepository(db *sql.DB) domains.PlaybookRepository {
	return &playbookRepository{db: db}
}

// ----------------------------------------------------------------------------
// Playbook operations
// ----------------------------------------------------------------------------

// CreatePlaybook inserts a new playbook row and returns the created record.
func (r *playbookRepository) CreatePlaybook(ctx context.Context, req domains.CreatePlaybookRequest) (domains.CreatePlaybookResponse, error) {
	const q = `
		INSERT INTO playbooks (team_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id, team_id, name, description, created_at`

	pb := &models.Playbook{}
	err := r.db.QueryRowContext(ctx, q, req.TeamID, req.Name, req.Description).Scan(
		&pb.ID,
		&pb.TeamID,
		&pb.Name,
		&pb.Description,
		&pb.CreatedAt,
	)
	if err != nil {
		return domains.CreatePlaybookResponse{}, fmt.Errorf("create playbook: %w", err)
	}
	return domains.CreatePlaybookResponse{Playbook: pb}, nil
}

// GetPlaybook returns the playbook matching the given ID, or ErrNotFound.
func (r *playbookRepository) GetPlaybook(ctx context.Context, req domains.GetPlaybookRequest) (domains.GetPlaybookResponse, error) {
	const q = `
		SELECT id, team_id, name, description, created_at
		FROM playbooks
		WHERE id = $1`

	pb := &models.Playbook{}
	err := r.db.QueryRowContext(ctx, q, req.PlaybookID).Scan(
		&pb.ID,
		&pb.TeamID,
		&pb.Name,
		&pb.Description,
		&pb.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetPlaybookResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetPlaybookResponse{}, fmt.Errorf("get playbook: %w", err)
	}
	return domains.GetPlaybookResponse{Playbook: pb}, nil
}

// ListPlaybooks returns all playbooks belonging to the given team, ordered by
// creation time ascending.
func (r *playbookRepository) ListPlaybooks(ctx context.Context, req domains.ListPlaybooksRequest) (domains.ListPlaybooksResponse, error) {
	const q = `
		SELECT id, team_id, name, description, created_at
		FROM playbooks
		WHERE team_id = $1
		ORDER BY created_at ASC`

	rows, err := r.db.QueryContext(ctx, q, req.TeamID)
	if err != nil {
		return domains.ListPlaybooksResponse{}, fmt.Errorf("list playbooks: %w", err)
	}
	defer rows.Close()

	var playbooks []*models.Playbook
	for rows.Next() {
		pb := &models.Playbook{}
		if err := rows.Scan(
			&pb.ID,
			&pb.TeamID,
			&pb.Name,
			&pb.Description,
			&pb.CreatedAt,
		); err != nil {
			return domains.ListPlaybooksResponse{}, fmt.Errorf("scan playbook row: %w", err)
		}
		playbooks = append(playbooks, pb)
	}
	if err := rows.Err(); err != nil {
		return domains.ListPlaybooksResponse{}, fmt.Errorf("list playbooks rows: %w", err)
	}

	if playbooks == nil {
		playbooks = []*models.Playbook{}
	}
	return domains.ListPlaybooksResponse{Playbooks: playbooks}, nil
}

// UpdatePlaybook applies non-nil field updates to the playbook and returns the
// updated record, or ErrNotFound if no row matched.
func (r *playbookRepository) UpdatePlaybook(ctx context.Context, req domains.UpdatePlaybookRequest) (domains.UpdatePlaybookResponse, error) {
	const q = `
		UPDATE playbooks
		SET
			name        = COALESCE($1, name),
			description = COALESCE($2, description)
		WHERE id = $3
		RETURNING id, team_id, name, description, created_at`

	pb := &models.Playbook{}
	err := r.db.QueryRowContext(ctx, q, req.Name, req.Description, req.PlaybookID).Scan(
		&pb.ID,
		&pb.TeamID,
		&pb.Name,
		&pb.Description,
		&pb.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domains.UpdatePlaybookResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.UpdatePlaybookResponse{}, fmt.Errorf("update playbook: %w", err)
	}
	return domains.UpdatePlaybookResponse{Playbook: pb}, nil
}

// DeletePlaybook removes a playbook by ID. Cascade delete handles plays rows.
func (r *playbookRepository) DeletePlaybook(ctx context.Context, req domains.DeletePlaybookRequest) (domains.DeletePlaybookResponse, error) {
	const q = `DELETE FROM playbooks WHERE id = $1`
	result, err := r.db.ExecContext(ctx, q, req.PlaybookID)
	if err != nil {
		return domains.DeletePlaybookResponse{}, fmt.Errorf("delete playbook: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return domains.DeletePlaybookResponse{}, fmt.Errorf("delete playbook rows affected: %w", err)
	}
	if n == 0 {
		return domains.DeletePlaybookResponse{}, ErrNotFound
	}
	return domains.DeletePlaybookResponse{}, nil
}

// ----------------------------------------------------------------------------
// Play operations
// ----------------------------------------------------------------------------

// scanPlay reads a plays row into a models.Play. diagram_json is stored as
// JSONB and scanned into a []byte first, then wrapped as json.RawMessage so
// it round-trips to the client without re-encoding.
func scanPlay(row interface {
	Scan(dest ...any) error
}) (*models.Play, error) {
	p := &models.Play{}
	var diagramRaw []byte
	if err := row.Scan(
		&p.ID,
		&p.PlaybookID,
		&p.Name,
		&p.Category,
		&p.Description,
		&diagramRaw,
		&p.CreatedAt,
	); err != nil {
		return nil, err
	}
	if diagramRaw != nil {
		raw := json.RawMessage(diagramRaw)
		p.DiagramJSON = &raw
	}
	return p, nil
}

// CreatePlay inserts a new play row and returns the created record.
func (r *playbookRepository) CreatePlay(ctx context.Context, req domains.CreatePlayRequest) (domains.CreatePlayResponse, error) {
	const q = `
		INSERT INTO plays (playbook_id, name, category, description, diagram_json)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, playbook_id, name, category, description, diagram_json, created_at`

	var diagramArg interface{}
	if req.DiagramJSON != nil {
		diagramArg = []byte(*req.DiagramJSON)
	}

	p, err := scanPlay(r.db.QueryRowContext(ctx, q,
		req.PlaybookID,
		req.Name,
		req.Category,
		req.Description,
		diagramArg,
	))
	if err != nil {
		return domains.CreatePlayResponse{}, fmt.Errorf("create play: %w", err)
	}
	return domains.CreatePlayResponse{Play: p}, nil
}

// GetPlay returns the play matching the given ID, or ErrNotFound.
func (r *playbookRepository) GetPlay(ctx context.Context, req domains.GetPlayRequest) (domains.GetPlayResponse, error) {
	const q = `
		SELECT id, playbook_id, name, category, description, diagram_json, created_at
		FROM plays
		WHERE id = $1`

	p, err := scanPlay(r.db.QueryRowContext(ctx, q, req.PlayID))
	if errors.Is(err, sql.ErrNoRows) {
		return domains.GetPlayResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.GetPlayResponse{}, fmt.Errorf("get play: %w", err)
	}
	return domains.GetPlayResponse{Play: p}, nil
}

// ListPlays returns all plays belonging to the given playbook, ordered by
// creation time ascending.
func (r *playbookRepository) ListPlays(ctx context.Context, req domains.ListPlaysRequest) (domains.ListPlaysResponse, error) {
	const q = `
		SELECT id, playbook_id, name, category, description, diagram_json, created_at
		FROM plays
		WHERE playbook_id = $1
		ORDER BY created_at ASC`

	rows, err := r.db.QueryContext(ctx, q, req.PlaybookID)
	if err != nil {
		return domains.ListPlaysResponse{}, fmt.Errorf("list plays: %w", err)
	}
	defer rows.Close()

	var plays []*models.Play
	for rows.Next() {
		p, err := scanPlay(rows)
		if err != nil {
			return domains.ListPlaysResponse{}, fmt.Errorf("scan play row: %w", err)
		}
		plays = append(plays, p)
	}
	if err := rows.Err(); err != nil {
		return domains.ListPlaysResponse{}, fmt.Errorf("list plays rows: %w", err)
	}

	if plays == nil {
		plays = []*models.Play{}
	}
	return domains.ListPlaysResponse{Plays: plays}, nil
}

// UpdatePlay applies non-nil field updates to the play and returns the updated
// record, or ErrNotFound if no row matched.
func (r *playbookRepository) UpdatePlay(ctx context.Context, req domains.UpdatePlayRequest) (domains.UpdatePlayResponse, error) {
	const q = `
		UPDATE plays
		SET
			name         = COALESCE($1, name),
			category     = COALESCE($2, category),
			description  = COALESCE($3, description),
			diagram_json = COALESCE($4, diagram_json)
		WHERE id = $5
		RETURNING id, playbook_id, name, category, description, diagram_json, created_at`

	var diagramArg interface{}
	if req.DiagramJSON != nil {
		diagramArg = []byte(*req.DiagramJSON)
	}

	p, err := scanPlay(r.db.QueryRowContext(ctx, q,
		req.Name,
		req.Category,
		req.Description,
		diagramArg,
		req.PlayID,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return domains.UpdatePlayResponse{}, ErrNotFound
	}
	if err != nil {
		return domains.UpdatePlayResponse{}, fmt.Errorf("update play: %w", err)
	}
	return domains.UpdatePlayResponse{Play: p}, nil
}

// DeletePlay removes a play by ID.
func (r *playbookRepository) DeletePlay(ctx context.Context, req domains.DeletePlayRequest) (domains.DeletePlayResponse, error) {
	const q = `DELETE FROM plays WHERE id = $1`
	result, err := r.db.ExecContext(ctx, q, req.PlayID)
	if err != nil {
		return domains.DeletePlayResponse{}, fmt.Errorf("delete play: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return domains.DeletePlayResponse{}, fmt.Errorf("delete play rows affected: %w", err)
	}
	if n == 0 {
		return domains.DeletePlayResponse{}, ErrNotFound
	}
	return domains.DeletePlayResponse{}, nil
}
