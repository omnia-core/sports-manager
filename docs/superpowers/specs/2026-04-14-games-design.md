# Games Feature — Design Spec
**Date:** 2026-04-14
**Status:** Approved

## Overview

Coaches can create game records for their team, track per-player stats either live during the game or post-game via a box score editor. The feature is designed to extend later with opponent stats and AI-assisted stat tracking from video.

---

## Data Model

Three new tables added via `golang-migrate` SQL migrations.

```sql
games
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE
  opponent_name text NOT NULL
  game_date   date NOT NULL
  team_score  int
  opponent_score int
  created_at  timestamptz NOT NULL DEFAULT now()

game_players
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  game_id     uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  is_dnp      bool NOT NULL DEFAULT false
  created_at  timestamptz NOT NULL DEFAULT now()
  UNIQUE (game_id, user_id)
  -- seeded from team_members when the game is created

game_stats
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  game_player_id  uuid NOT NULL REFERENCES game_players(id) ON DELETE CASCADE UNIQUE
  mins            int NOT NULL DEFAULT 0
  pts             int NOT NULL DEFAULT 0
  fgm             int NOT NULL DEFAULT 0
  fga             int NOT NULL DEFAULT 0
  three_pm        int NOT NULL DEFAULT 0
  three_pa        int NOT NULL DEFAULT 0
  ftm             int NOT NULL DEFAULT 0
  fta             int NOT NULL DEFAULT 0
  orb             int NOT NULL DEFAULT 0
  drb             int NOT NULL DEFAULT 0
  ast             int NOT NULL DEFAULT 0
  stl             int NOT NULL DEFAULT 0
  blk             int NOT NULL DEFAULT 0
  tov             int NOT NULL DEFAULT 0
  pf              int NOT NULL DEFAULT 0
  plus_minus      int NOT NULL DEFAULT 0
```

**Computed on the frontend** (never stored):
- `FG% = fgm / fga`
- `3P% = three_pm / three_pa`
- `FT% = ftm / fta`
- `REB = orb + drb`

`pts` is stored directly alongside shooting stats so coaches can enter the point total independently of shooting detail.

---

## API Routes

All routes require JWT auth. Mutation routes (POST, PUT, PATCH, DELETE) require the caller to be the team's coach.

```
GET    /api/teams/:teamID/games           — list games, newest first
POST   /api/teams/:teamID/games           — create game; seeds game_players from team_members

GET    /api/games/:gameID                 — game detail + all player stat lines (single payload)
PUT    /api/games/:gameID                 — update game header (opponent, date, scores)
DELETE /api/games/:gameID

PUT    /api/games/:gameID/stats/:userID   — upsert a player's full stat line
PATCH  /api/games/:gameID/players/:userID — toggle is_dnp
```

### GET /api/games/:gameID response shape

```json
{
  "game": {
    "id": "...",
    "team_id": "...",
    "opponent_name": "Lakers",
    "game_date": "2026-04-14",
    "team_score": 88,
    "opponent_score": 72
  },
  "players": [
    {
      "user_id": "...",
      "name": "Kevin",
      "jersey_number": "23",
      "position": "PG",
      "is_dnp": false,
      "stats": {
        "mins": 32, "pts": 18, "fgm": 7, "fga": 14,
        "three_pm": 2, "three_pa": 5,
        "ftm": 2, "fta": 3,
        "orb": 1, "drb": 4,
        "ast": 5, "stl": 2, "blk": 0, "tov": 1, "pf": 2, "plus_minus": 12
      }
    }
  ]
}
```

DNP players are included with `is_dnp: true` and `stats: null`.

---

## Backend Architecture

Follows the existing layered pattern: `domains/` → `usecase/` → `repository/` → `handlers/`.

- `domains/game.go` — `GameUsecase`, `GameRepository` interfaces + all request/response types
- `usecase/game.go` — business logic (seed players on create, upsert stats, toggle DNP)
- `repository/game.go` — SQL implementations
- `handlers/game.go` — HTTP handlers, registered in `cmd/server/main.go`

New sentinel errors added to `usecase/` and mapped in `handlers/errors.go`:
- `ErrGameNotFound`
- `ErrNotTeamCoach` (reuse existing `ErrForbidden` pattern)

---

## Frontend Architecture

### New files

```
src/
  api/games.ts                  — typed fetch wrappers for all game endpoints
  stores/gameStore.ts           — Zustand store: games list, currentGame, upsertStat, toggleDNP
  pages/
    teams/GameDetailPage.tsx    — box score + live tracking UI
  types/                        — Game, GamePlayer, GameStats types
```

### Navigation

"Games" tab added to `TeamDetailPage` alongside the existing Roster tab. List shows date, opponent, result (W/L/—), and score.

### GameDetailPage — two modes

**Box Score mode** (default):
- Horizontally scrollable table, one row per player
- Editable numeric cells for all counting stats; changes upsert on cell blur
- Computed columns (FG%, 3P%, FT%, REB) rendered read-only in a muted color
- DNP players grayed out at the bottom with "Mark active" button
- Team totals row pinned at the bottom

**Live mode** (toggled via header button):
- Scrollable grid of player cards showing name, jersey number, and running PTS / REB / AST
- Tap a card → slide-up panel with large tap buttons:
  - **Scoring:** `+2` `+3` `+FT made` `+FT miss`
  - **Shooting tracking:** `FG made` `FG miss` (2PT/non-FT)
  - **Other:** `AST` `STL` `BLK` `TOV` `Foul`
  - **Rebound:** tap → choose `ORB` or `DRB`
- Each tap immediately calls `PUT /api/games/:gameID/stats/:userID` with the incremented value
- Running team score updates as points are logged
- DNP toggled via long-press on a player card

---

## Extensibility Notes

The schema and API are intentionally minimal for MVP. Future extensions:
- **Opponent stats:** add `opponent_game_players` + `opponent_game_stats` tables, or a `side` column on `game_players`
- **AI stat tracking:** video upload → stat extraction pipeline writes to the same `PUT /api/games/:gameID/stats/:userID` endpoint
- **Play-by-play:** a `game_events` table keyed to `game_id` + timestamp, which the live UI already resembles

---

## Out of Scope (MVP)

- Opponent roster / per-player opponent stats
- Game schedule / upcoming games (date is recorded but no calendar view)
- Push notifications
- Video upload
