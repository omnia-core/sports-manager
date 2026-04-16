ALTER TABLE game_players ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE game_players DROP CONSTRAINT IF EXISTS game_players_game_id_member_id_key;
ALTER TABLE game_players ADD CONSTRAINT game_players_game_id_user_id_key UNIQUE (game_id, user_id);
ALTER TABLE game_players DROP COLUMN IF EXISTS team_member_id;
