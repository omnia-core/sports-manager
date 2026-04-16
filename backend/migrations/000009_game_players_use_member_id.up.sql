-- Add team_member_id to game_players so ALL roster members (including placeholders) can be tracked.
ALTER TABLE game_players
    ADD COLUMN team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE;

-- Backfill team_member_id from team_members using the game's team_id.
UPDATE game_players
SET team_member_id = (
    SELECT tm.id
    FROM team_members tm
    JOIN games g ON g.team_id = tm.team_id
    WHERE g.id = game_players.game_id
      AND tm.user_id = game_players.user_id
    LIMIT 1
);

-- Make team_member_id mandatory now that it's backfilled.
ALTER TABLE game_players ALTER COLUMN team_member_id SET NOT NULL;

-- Drop the old (game_id, user_id) unique constraint and add (game_id, team_member_id).
ALTER TABLE game_players DROP CONSTRAINT game_players_game_id_user_id_key;
ALTER TABLE game_players ADD CONSTRAINT game_players_game_id_member_id_key UNIQUE (game_id, team_member_id);

-- user_id is now informational only (kept for reference, nullable for placeholder members).
ALTER TABLE game_players ALTER COLUMN user_id DROP NOT NULL;
