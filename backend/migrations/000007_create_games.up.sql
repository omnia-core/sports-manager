CREATE TABLE IF NOT EXISTS games (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id        UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    opponent_name  TEXT        NOT NULL,
    game_date      DATE        NOT NULL,
    team_score     INT,
    opponent_score INT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_team_id ON games(team_id);

CREATE TABLE IF NOT EXISTS game_players (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id    UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_dnp     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);

CREATE TABLE IF NOT EXISTS game_stats (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE UNIQUE,
    mins           INT  NOT NULL DEFAULT 0,
    pts            INT  NOT NULL DEFAULT 0,
    fgm            INT  NOT NULL DEFAULT 0,
    fga            INT  NOT NULL DEFAULT 0,
    three_pm       INT  NOT NULL DEFAULT 0,
    three_pa       INT  NOT NULL DEFAULT 0,
    ftm            INT  NOT NULL DEFAULT 0,
    fta            INT  NOT NULL DEFAULT 0,
    orb            INT  NOT NULL DEFAULT 0,
    drb            INT  NOT NULL DEFAULT 0,
    ast            INT  NOT NULL DEFAULT 0,
    stl            INT  NOT NULL DEFAULT 0,
    blk            INT  NOT NULL DEFAULT 0,
    tov            INT  NOT NULL DEFAULT 0,
    pf             INT  NOT NULL DEFAULT 0,
    plus_minus     INT  NOT NULL DEFAULT 0
);
