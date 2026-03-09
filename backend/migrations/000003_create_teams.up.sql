CREATE TABLE IF NOT EXISTS teams (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL,
    sport      TEXT        NOT NULL DEFAULT 'basketball' CHECK (sport IN ('basketball')),
    coach_id   UUID        NOT NULL REFERENCES users(id),
    logo_url   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id       UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role          TEXT        NOT NULL DEFAULT 'player' CHECK (role IN ('coach', 'player')),
    jersey_number INT,
    position      TEXT,
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members (team_id);
