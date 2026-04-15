-- Make user_id nullable so coaches can add placeholder roster slots
ALTER TABLE team_members
    ALTER COLUMN user_id DROP NOT NULL;

-- Add a display name for placeholder members (also stores real name for linked members)
ALTER TABLE team_members
    ADD COLUMN name TEXT;

-- Enforce uniqueness only when a user_id is actually assigned
CREATE UNIQUE INDEX team_members_team_user_unique
    ON team_members (team_id, user_id)
    WHERE user_id IS NOT NULL;

-- Drop the old NOT NULL unique constraint if it exists as a separate index
-- (the original migration used a UNIQUE constraint inline; this drops the implicit index)
DROP INDEX IF EXISTS team_members_team_id_user_id_key;

-- Link invites to a specific roster slot (optional)
ALTER TABLE team_invites
    ADD COLUMN team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL;
