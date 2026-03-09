CREATE TABLE IF NOT EXISTS team_invites (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email      TEXT        NOT NULL,
    token      UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_team_id_email ON team_invites (team_id, email);
