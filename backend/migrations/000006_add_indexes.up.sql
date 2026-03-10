-- Performance indexes for common query patterns.

-- Teams by coach (ListTeams filters on coach_id via team_members join)
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON teams(coach_id);

-- Team membership lookups (most auth checks walk team_members)
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Invite lookup by token (AcceptInvite)
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);

-- Invite lookup by team + status (duplicate-pending check)
CREATE INDEX IF NOT EXISTS idx_team_invites_team_status ON team_invites(team_id, status);

-- Playbooks by team
CREATE INDEX IF NOT EXISTS idx_playbooks_team_id ON playbooks(team_id);

-- Plays by playbook
CREATE INDEX IF NOT EXISTS idx_plays_playbook_id ON plays(playbook_id);
