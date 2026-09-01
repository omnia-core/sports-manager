# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
