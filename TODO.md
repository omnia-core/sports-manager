# TODO

Build order follows dependency chain — backend auth must exist before frontend auth, etc.

## Phase 1 — Scaffolding ✓
- [x] Initialize Go module (`backend/`)
- [x] Initialize Vite + React + TypeScript app (`frontend/`)
- [x] Configure Tailwind CSS
- [x] Set up PostgreSQL (local dev via Docker)
- [x] Set up migration tooling (e.g., `golang-migrate`)
- [x] Configure `.gitignore` for Go and updated frontend stack

## Phase 2 — Backend Auth ✓
- [x] `users` table migration
- [x] `POST /api/auth/register` — email/password
- [x] `POST /api/auth/login` — email/password + JWT cookie
- [x] `POST /api/auth/logout`
- [x] JWT middleware (validate cookie, attach user to context)
- [ ] `POST /api/auth/google` — Google OAuth (deferred to post-MVP)

## Phase 3 — Teams ✓
- [x] `teams` and `team_members` migrations
- [x] `GET/POST /api/teams` — list and create
- [x] `GET/PUT/DELETE /api/teams/:id`
- [x] `GET /api/teams/:id/members`

## Phase 4 — Invite Flow ✓
- [x] `team_invites` migration
- [x] `POST /api/teams/:id/members` — create invite + send email
- [x] `POST /api/invites/:token/accept` — accept invite, add to team_members
- [x] Mailer setup (invite email template)

## Phase 5 — Playbooks & Plays ✓
- [x] `playbooks` and `plays` migrations
- [x] `GET/POST /api/teams/:id/playbooks`
- [x] `GET/PUT/DELETE /api/playbooks/:id`
- [x] `GET/POST /api/playbooks/:id/plays`
- [x] `GET/PUT/DELETE /api/plays/:id`

## Phase 6 — Frontend Auth ✓
- [x] Login page
- [x] Register page
- [x] Accept-invite page
- [x] Auth store (Zustand) + protected route wrapper
- [x] Role-based routing (coach vs player views)
- [ ] Google OAuth button + callback handling (deferred to post-MVP)

## Phase 7 — Frontend Teams ✓
- [x] Team list page (coach dashboard)
- [x] Create team form
- [x] Team detail page
- [x] Roster tab — list members, invite player by email

## Phase 8 — Frontend Playbooks ✓
- [x] Playbook list page (per team)
- [x] Create playbook form
- [x] Play list (per playbook)
- [x] Play editor page (Konva canvas)
  - [x] Basketball court background (halfcourt / fullcourt)
  - [x] Draggable player tokens (offense + defense)
  - [x] Drawable arrows (run / pass / screen styles)
  - [x] Text annotations
  - [x] Save / load `diagram_json`

## Phase 9 — PWA ✓
- [x] PWA manifest
- [x] Service worker (via `vite-plugin-pwa`)
- [x] Offline support (read-only cached data)

## Future (Post-MVP)
- [ ] Google OAuth (backend + frontend)
- [ ] Player stats tracking (basketball: points, assists, rebounds, etc.)
- [ ] Schedule management (games and practices)
- [ ] Push notifications for schedule changes
- [ ] Additional sports support
- [ ] Apple Sign-In (if native iOS app is added)
- [ ] Delete team member from roster
