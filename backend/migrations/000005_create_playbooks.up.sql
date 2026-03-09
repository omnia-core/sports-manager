CREATE TABLE IF NOT EXISTS playbooks (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbooks_team_id ON playbooks(team_id);

CREATE TABLE IF NOT EXISTS plays (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id  UUID        NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    category     TEXT        NOT NULL DEFAULT 'offense'
                             CHECK (category IN ('offense', 'defense', 'special')),
    description  TEXT,
    diagram_json JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plays_playbook_id ON plays(playbook_id);
