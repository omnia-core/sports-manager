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

## Project Docs

| Doc | What it is |
|---|---|
| [docs/KANBAN.md](./docs/KANBAN.md) | The shared board. Every open card (`SM-<n>`), its priority, the pain it fixes, and why it sits where it does. Start here to see what is being built next. |
| [docs/design/](./docs/design/) | Interaction specs, one per card. Written before the card is built. |
| [docs/test-plans/](./docs/test-plans/) | Test plans per feature area, with the blocking tests called out. |
| [docs/superpowers/](./docs/superpowers/) | The original plan and design spec for the games feature. |
| [CHANGELOG.md](./CHANGELOG.md) | What shipped in each release. |

## Architecture Notes

Layer responsibilities, naming conventions, and the interface design rules used throughout the
backend are kept in `CLAUDE.md` at the repo root. That file is local-only and not committed, so
the short version: `domains/` holds interfaces, `usecase/` holds business logic, `repository/`
holds all SQL, and `handlers/` holds HTTP only. Handlers depend on usecase interfaces, usecases
depend on repository interfaces, and sentinel errors map to HTTP status codes in one place
(`backend/internal/handlers/errors.go`).
