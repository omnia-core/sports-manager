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
- **Roster** — Invite players by email; players accept via link; coaches can remove players
- **Playbooks** — Create/edit/delete playbooks per team with an interactive canvas drawing tool
  - Basketball court (halfcourt or fullcourt)
  - Draggable offense/defense player tokens
  - Run, pass, screen arrows
  - Text annotations (double-click to edit)
- **PWA** — Installable, offline-capable (cached read-only views of teams, playbooks, plays)

## Getting Started

### Prerequisites

- Go 1.22+
- Node.js 20+
- PostgreSQL 15+
- [`golang-migrate`](https://github.com/golang-migrate/migrate) CLI

### Backend

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

### Frontend

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

## Architecture Notes

See [CLAUDE.md](./CLAUDE.md) for full architecture, layer responsibilities, naming conventions, and interface design rules used throughout the codebase.
