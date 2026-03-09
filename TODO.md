# TODO

Build order follows dependency chain — backend auth must exist before frontend auth, etc.

## Phase 1 — Scaffolding
- [ ] Initialize Go module (`backend/`)
- [ ] Initialize Vite + React + TypeScript app (`frontend/`)
- [ ] Configure Tailwind CSS
- [ ] Set up PostgreSQL (local dev via Docker)
- [ ] Set up migration tooling (e.g., `golang-migrate`)
- [ ] Configure `.gitignore` for Go and updated frontend stack

## Phase 2 — Backend Auth
- [ ] `users` table migration
- [ ] `POST /api/auth/register` — email/password
- [ ] `POST /api/auth/login` — email/password + JWT cookie
- [ ] `POST /api/auth/google` — Google OAuth
- [ ] `POST /api/auth/logout`
- [ ] JWT middleware (validate cookie, attach user to context)
- [ ] Role middleware (coach vs player checks)

## Phase 3 — Teams
- [ ] `teams` and `team_members` migrations
- [ ] `GET/POST /api/teams` — list and create
- [ ] `GET/PUT/DELETE /api/teams/:id`
- [ ] `GET /api/teams/:id/members`

## Phase 4 — Invite Flow
- [ ] `team_invites` migration
- [ ] `POST /api/teams/:id/members` — create invite + send email
- [ ] `POST /api/invites/:token/accept` — accept invite, add to team_members
- [ ] Mailer setup (invite email template)

## Phase 5 — Playbooks & Plays
- [ ] `playbooks` and `plays` migrations
- [ ] `GET/POST /api/teams/:id/playbooks`
- [ ] `GET/PUT/DELETE /api/playbooks/:id`
- [ ] `GET/POST /api/playbooks/:id/plays`
- [ ] `GET/PUT/DELETE /api/plays/:id`

## Phase 6 — Frontend Auth
- [ ] Login page
- [ ] Register page
- [ ] Google OAuth button + callback handling
- [ ] Accept-invite page
- [ ] Auth store (Zustand) + protected route wrapper
- [ ] Role-based routing (coach vs player views)

## Phase 7 — Frontend Teams
- [ ] Team list page (coach dashboard)
- [ ] Create team form
- [ ] Team detail page
- [ ] Roster tab — list members, invite player by email

## Phase 8 — Frontend Playbooks
- [ ] Playbook list page (per team)
- [ ] Create playbook form
- [ ] Play list (per playbook)
- [ ] Play editor page (Konva canvas)
  - [ ] Basketball court background (halfcourt / fullcourt)
  - [ ] Draggable player tokens (offense + defense)
  - [ ] Drawable arrows (run / pass / screen styles)
  - [ ] Text annotations
  - [ ] Save / load `diagram_json`

## Phase 9 — PWA
- [ ] PWA manifest
- [ ] Service worker (via `vite-plugin-pwa`)
- [ ] Offline support (read-only cached data)

## Future (Post-MVP)
- [ ] Player stats tracking (basketball: points, assists, rebounds, etc.)
- [ ] Schedule management (games and practices)
- [ ] Push notifications for schedule changes
- [ ] Additional sports support
- [ ] Apple Sign-In (if native iOS app is added)
