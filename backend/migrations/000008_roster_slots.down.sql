ALTER TABLE team_invites DROP COLUMN IF EXISTS team_member_id;
DROP INDEX IF EXISTS team_members_team_user_unique;
ALTER TABLE team_members DROP COLUMN IF EXISTS name;
ALTER TABLE team_members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);
