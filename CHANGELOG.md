# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `fly.toml` for both apps, and a Deployment section in the README. The API app
  has no public address: nginx on the public app proxies `/api` to it over Fly's
  private network, which is what keeps the `SameSite=Lax` auth cookies working.
- The backend image now also builds `cmd/migrate` and ships `migrations/`, so
  Fly's `release_command` can apply migrations before new machines take traffic.

### Fixed

- **The PWA shipped dead in every Docker build.** `frontend/Dockerfile` hardcoded
  `ENV VITE_DISABLE_SW=true`, so no service worker was generated — no offline
  caching, not installable. That is the feature a coach needs courtside with no
  signal. It is now a build arg defaulting to `false`; docker-compose passes
  `true` so local runs keep the old behaviour.

### Changed

- The server binds `PORT` (default 8080) instead of a hardcoded `:8080`.
- nginx's proxy target is `API_UPSTREAM`, defaulting to `backend:8080` so
  Compose is unchanged. `nginx.conf` became `nginx.conf.template`, rendered by
  the nginx image's entrypoint at container start.
- The README's Project Docs table is now a short note. It still points at the changelog
  and the backlog, and it says plainly that `docs/` is local-only, the same way the
  Architecture Notes section already does for `CLAUDE.md`.

### Removed

- `docs/` is no longer tracked. The board, the per-card design specs, the test plans,
  and the superpowers plan/spec are agent workfiles — internal working notes for a
  single-owner project — so they now live only in the working copy. The files are
  unchanged on disk; only their tracking is gone. `.gitignore` keeps them out.

## [0.0.1.0] - 2026-09-01

### Added

- `docs/KANBAN.md` — a shared board for the games and live-stat work, with 13 cards
  (SM-1 through SM-14) in dependency build order, a stated-premises table, and an
  append-only decision log. Coaches' game-day workflow is the focus; each card records
  the user pain, the root cause with file references, and why it sits where it does.
- `docs/design/SM-1-live-stat-reliability.md` — the interaction design for making live
  stat entry trustworthy: what a coach sees the instant they tap, an honest save state,
  undo, and offline behaviour.
- `docs/test-plans/games-live-stats-test-plan.md` — 15 tests covering the live stat
  path, nine of them blocking, including the concurrency case that today cannot be
  written because the frontend has no test runner.
- `docs/superpowers/` — the original games plan and design spec, previously untracked.
- `VERSION` and this changelog. The project had no release convention before now.

### Changed

- Reordered the games backlog after a full plan review. Work now runs
  SM-9 → SM-3 → SM-2 → SM-10 → SM-13 → SM-4, with SM-1 last. It previously led with
  SM-1, which turned out to depend on four things that were either lower down or
  missing entirely.
- Merged the first-run empty-state card into the roster-entry card. They are one
  problem: a coach who abandons at the empty screen never reaches the roster form.
- Dropped the shareable game recap's dependency on season aggregates. A per-game
  recap link needs no aggregate data model.
- `README.md` now lists the games and roster work under Features, and carries a Project
  Docs table pointing at the board, the design specs, and the test plans. Every doc in
  `docs/` is now reachable from the front page. The Architecture Notes section no longer
  links to `CLAUDE.md`, which is not committed, so the link went nowhere for anyone who
  cloned the repo; the rules it pointed at are summarised inline instead.

### Notes

Five issues were opened that no one had recorded before: the session expiring
mid-game, the absent frontend test runner, the stat-write endpoint's inability to
express per-action retry and undo, the unconfirmed assumption about who keeps the
book, and a client-side cache retention issue on shared devices.

This release changes documentation only. No application code was modified.
