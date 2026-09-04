-- Team score is the sum of the box score. Storing it created a second source
-- of truth for one number: once written it stopped moving when stats were
-- corrected, and COALESCE($n, team_score) meant it could never be cleared.
-- Nothing ever wrote it, so no data is lost. It is now derived on read.
ALTER TABLE games DROP COLUMN IF EXISTS team_score;
