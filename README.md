# Sports Manager

A sports team management PWA for coaches and players. Coaches create and manage teams, build playbooks with a built-in drawing tool, manage rosters, and invite players. Players join via invite link and get a view of their team info and team playbooks.

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS (PWA via vite-plugin-pwa)
- **Backend:** Go (`net/http` + chi router)
- **Database:** PostgreSQL
- **Auth:** Email/password with JWT (access token in httpOnly cookie) + refresh tokens

## Features (MVP — Basketball)

- **Auth** — Email/password registration and login with JWT + refresh-token rotation
- **Teams** — Coaches create, edit, and delete teams; players see teams they belong to
- **Roster** — Add a player by name straight to the roster, or invite them by email; invited players
  accept via link and link up to their slot. Coaches edit jersey numbers and positions, and remove players
- **Games** — Log a game against an opponent, then keep the book two ways: a **Box Score** table for
  typing a full line, and **Live Track** for tapping stats one event at a time during play. 16 stat
  columns (mins, pts, FG, 3P, FT, ORB/DRB, ast, stl, blk, tov, pf, +/-), plus a DNP toggle per player
- **Playbooks** — Create/edit/delete playbooks per team with an interactive canvas drawing tool
  - Basketball court (halfcourt or fullcourt)
  - Draggable offense/defense player tokens
  - Run, pass, screen arrows
  - Text annotations (double-click to edit)
- **PWA** — Installable, offline-capable (cached read-only views of teams, playbooks, plays)

## Getting Started

### Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up --build
```

Opens at **http://localhost:3000**. Data persists across restarts — only `docker compose down -v` wipes the database.

---

### Local Development

#### Prerequisites

- Go 1.22+
- Node.js 20+
- PostgreSQL 15+
- [`golang-migrate`](https://github.com/golang-migrate/migrate) CLI

#### Backend

```bash
cd backend

# Copy and fill in environment variables
cp .env.example .env.local

# Run migrations
migrate -path migrations -database "$DATABASE_URL" up

# Start dev server (port 8080)
go run cmd/server/main.go
```

**Environment variables** (`.env.local`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |
| `SMTP_HOST` | SMTP server for invite emails |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USERNAME` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | From address for emails |
| `APP_URL` | Frontend base URL (default: http://localhost:5173) |
| `ALLOWED_ORIGIN` | CORS allowed origin (default: http://localhost:5173) |

#### Frontend

```bash
cd frontend
npm install
npm run dev        # Dev server on port 5173
npm run build      # Production build
npm run lint       # ESLint
```

## Database

Migrations live in `backend/migrations/`. Run with `golang-migrate`:

```bash
# Apply all migrations
migrate -path backend/migrations -database "postgres://..." up

# Roll back one migration
migrate -path backend/migrations -database "postgres://..." down 1
```

## Invite Flow

1. Coach enters player email on the team's Roster tab → invite email sent
2. Player clicks link → lands on `/accept-invite?token=<uuid>`
3. Player logs in (or registers — invite token is preserved through auth pages)
4. Invite auto-accepted → player added to the team

## Deployment (Fly.io)

Two apps. `sports-manager` is public: nginx serves the built PWA and
reverse-proxies `/api` to `sports-manager-api`, which has no public address and
is reachable only over Fly's private network.

That shape is not incidental. Auth cookies are `SameSite=Lax`, so the browser
sends them only on same-origin requests. Both halves must sit behind one public
origin — putting the API on its own hostname would mean the cookie is never
sent and every API call 401s.

### First deploy

```bash
# 1. API app, created but not yet deployed — it needs secrets first
fly apps create sports-manager-api
fly ips allocate-v6 --private -a sports-manager-api   # the .flycast address

# 2. Postgres, then wire the URL in. Any managed Postgres works; if you use one
#    outside Fly, make sure the URL ends with ?sslmode=require
fly postgres create --name sports-manager-db
fly postgres attach sports-manager-db -a sports-manager-api   # sets DATABASE_URL

# 3. Secrets. JWT_SECRET must be random — rotating it logs everyone out.
fly secrets set -a sports-manager-api   JWT_SECRET="$(openssl rand -base64 48)"   APP_URL="https://sports-manager.fly.dev"   ALLOWED_ORIGIN="https://sports-manager.fly.dev"   SMTP_HOST="..." SMTP_PORT="587"   SMTP_USERNAME="..." SMTP_PASSWORD="..." SMTP_FROM="..."

# 4. Deploy the API. release_command applies migrations first and fails the
#    deploy if one errors, leaving the old version serving.
fly deploy ./backend

# 5. Deploy the frontend
fly deploy ./frontend
```

Deploy order matters only the first time: the frontend's nginx resolves
`sports-manager-api.flycast` at startup, so the API needs its private address
allocated before the frontend boots.

### Later deploys

```bash
fly deploy ./backend    # runs migrations, then rolls the machines
fly deploy ./frontend
```

### Environment

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | API, required | `fly postgres attach` sets it. Needs `?sslmode=require` outside Fly. |
| `JWT_SECRET` | API, required | Random. Rotating invalidates every session. |
| `APP_URL` | API | Public URL. Invite email links are built from it, so a wrong value sends players to a dead link. |
| `ALLOWED_ORIGIN` | API | Public URL. |
| `SMTP_*` | API | **With `SMTP_HOST` unset, invites are silently skipped** — the coach sees success and the player never gets an email. Set these before inviting anyone. |
| `PORT` | API | Defaults to 8080; `fly.toml` sets it explicitly. |
| `API_UPSTREAM` | frontend | nginx's proxy target. Defaults to `backend:8080` for Compose. |
| `VITE_API_BASE_URL` | frontend, build arg | Empty means same-origin. Leave it empty. |
| `VITE_DISABLE_SW` | frontend, build arg | Defaults to `false`. Compose sets `true` so a stale worker doesn't confuse local runs. |

## Project Docs

[TODO.md](./TODO.md) tracks the post-MVP backlog.

Everything else is local to the working copy and not committed: the shared board, the per-card
design specs and the test plans in `docs/`, the running `CHANGELOG.md`, and `CLAUDE.md`. This is
a single-owner project and those are working notes rather than published material.

## Architecture Notes

Layer responsibilities, naming conventions, and the interface design rules used throughout the
backend are kept in `CLAUDE.md` at the repo root. That file is local-only and not committed, so
the short version: `domains/` holds interfaces, `usecase/` holds business logic, `repository/`
holds all SQL, and `handlers/` holds HTTP only. Handlers depend on usecase interfaces, usecases
depend on repository interfaces, and sentinel errors map to HTTP status codes in one place
(`backend/internal/handlers/errors.go`).
