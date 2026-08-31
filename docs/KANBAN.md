# Sports Manager — KANBAN Board

**Shared board.** The Project Manager owns it. The Designer and Developer read it, claim cards, and move them.

## How to use this board

- **Card ID** is permanent: `SM-<n>`. Never reuse or renumber.
- **Priority**: `P0` (broken / blocks users) > `P1` (high value) > `P2` (nice to have) > `P3` (someday).
- Move a card by cutting its row from one section and pasting it into the next. Never delete a card — archive it under **Done**.
- Only the PM adds cards to **Backlog**. Only the PM promotes Backlog → Ready for Design.
- The Designer writes a spec to `docs/design/SM-<n>-<slug>.md` and moves the card to **Ready for Dev**.
- The Developer implements, opens a PR, and moves the card to **In Review** with the PR link. The human merges; then it goes to **Done**.
- If a card is infeasible or harmful, move it to **Blocked** with a `Why` note and a proposed alternative. Do not silently drop it.

---

## Backlog
_PM-owned. Prioritized, not yet designed._

| ID | Title | Priority | Type | Notes |
|---|---|---|---|---|
| SM-4 | Team score is never saved, so no game ever gets a result | P1 | bug | **Pain:** "I entered a full box score and my games list still says the game never happened." **Detail:** `GameDetailPage` shows `game.team_score ?? teamScore` where `teamScore` is summed from player points on the fly, but nothing ever writes `team_score` back. Only `opponent_score` is settable, and only through a `window.prompt`. So `GamesTab.gameResult()` returns `—` forever and the team has no W/L record anywhere in the product. **Why:** every game; the final score is the single number a coach cares about most, and its absence makes the whole games list look broken. Also fold in: game dates render as raw `2026-08-31` strings on both the list row and the detail header. **Files:** `frontend/src/pages/teams/GameDetailPage.tsx`, `TeamDetailPage.tsx` (`GamesTab`), `backend/internal/repository/game_repository.go` (`UpdateGame` uses `COALESCE`, so a score can never be cleared back to null). |
| SM-5 | The live stat panel covers the roster, costing 3 taps per stat event | P1 | ux | **Pain:** "Every time a different player does something I have to close the panel, find him in the grid, and tap again — the ball is already down the other end." **Detail:** `LivePanel` is `fixed inset-0`, so the player grid underneath it is untappable. Switching players is close → find → tap → stat. A single possession is 4–6 stat events. Separately, `mode` is React state that resets to `boxscore` on every page load, so every time the phone sleeps mid-game the coach has to re-enter Live Track. **Why:** this is the core loop of the newest feature and it fails the sideline test — not one-handed, not 5 seconds, not without reading. **Files:** `frontend/src/pages/teams/GameDetailPage.tsx` (`LivePanel`, `LiveMode`). |
| SM-6 | Building a roster costs one full form submission per player | P1 | ux | **Pain:** "I have 15 players. I had to open the same form 15 times." **Detail:** `AddRosterForm` calls `onDone()` on success, which flips `showAddRoster` false and collapses the form. Per player: tap Add Player, type name, type jersey, type position, tap Add Player. There is no bulk or paste entry and no keep-open "add another". **Why:** first-run friction — this is the wall standing between signup and any value at all, and a coach hits it before they have seen a single feature work. **Files:** `frontend/src/pages/teams/TeamDetailPage.tsx` (`AddRosterForm`, roster tab). |
| SM-7 | A coach cannot see any player's totals or averages across games | P1 | feature | **Pain:** "I have logged eight games and I still cannot tell you what Marcus averages." **Detail:** stats exist only per game. There is no aggregate endpoint (the route table in `backend/cmd/server/main.go` confirms none), no season view, and no team record. **Why:** it is the reason to log stats at all — without it, every game a coach tracks is write-only. This is the second half of the `TODO.md` "Player stats tracking" item: per-game tracking shipped, the season layer did not. **Scope guard:** per-player season totals and averages plus a team W/L record. Not charts, not splits, not opponent scouting. Depends on SM-4 for the record. |
| SM-8 | A brand new coach lands on a blank page with no path forward | P2 | ux | **Pain:** "I signed up and got an empty screen that says 'No teams yet'." **Detail:** the zero-team state is one line of `text-foreground/50` with the only CTA parked in the top-right corner, away from where the eye lands. After creating a team the coach drops onto an empty Roster tab, and the app has no dashboard, no nav beyond a logout button, and no indication of what to do first (add players, then a playbook or a game). **Why:** lower frequency than the game-day cards — a coach hits it once — but it is where a product loses users before they ever reach the features that matter. **Files:** `frontend/src/pages/teams/TeamsPage.tsx`, `TeamDetailPage.tsx`, `frontend/src/components/ui/Layout.tsx`. |

## Ready for Design
_Designer picks the highest-priority card here._

| ID | Title | Priority | Type | Notes |
|---|---|---|---|---|
| SM-2 | Marking a player DNP wipes their stat line, permanently | P0 | bug | **Pain:** "I fat-fingered DNP next to my leading scorer and his 18 points disappeared — and I could not get them back." **Detail:** `gameStore.toggleDNP` sets `stats: is_dnp ? null : p.stats` locally. The backend never deletes the row, but the client throws its copy away. Toggling back to active then evaluates `p.stats` — already null — so the player returns showing all zeros. If the coach then types any value into that row, `handleStatChange` builds from `player.stats ?? emptyStats()` and PUTs an all-zero line, which the repository upsert commits over the real numbers. Local-only damage becomes permanent. **Why:** every game is one mis-tap away, and the DNP trigger is a bare `text-xs` button sitting immediately beside the player's name with no confirmation and no undo. **Wanted:** stop nulling stats client-side, make DNP reversible without loss, and give the control a target size and placement that does not sit under the player's name. **Files:** `frontend/src/stores/gameStore.ts` (`toggleDNP`), `frontend/src/pages/teams/GameDetailPage.tsx` (`BoxScoreTable`, `handleStatChange`). |

## Ready for Dev
_Designer has written a spec. Developer picks the highest-priority card here._

| ID | Title | Priority | Spec | Notes |
|---|---|---|---|---|
| SM-1 | Live stat taps are silently lost on gym wifi and on fast taps | P0 | `docs/design/SM-1-live-stat-reliability.md` | **Pain:** "I tapped +2, nothing moved, so I tapped again — and at the end of the quarter the numbers were wrong anyway." **Detail:** three compounding faults in one path. (1) No optimistic update: `handleLiveAction` awaits the network PUT before the store changes, so the tile does not react until the round trip returns. (2) Lost writes: it computes the new line from `currentGame`, which is still stale during that round trip, so two quick taps on the same player both start from the same base and the second silently overwrites the first. (3) Silent failure: `void onSaveStats(...)` and the un-caught `handleLiveAction` promise mean a failed write surfaces nothing at all, and `/api/games/*` is absent from the workbox `runtimeCaching` list, so the game page will not even open offline. **Why:** every game, every possession, in exactly the loud-gym bad-wifi environment this product exists for. Both a trust failure and real data loss. **Wanted:** apply the tap to local state first, queue the write, show an honest save state (saved / pending / failed), and give the coach an undo for the last action. **Files:** `frontend/src/pages/teams/GameDetailPage.tsx`, `frontend/src/stores/gameStore.ts`, `frontend/vite.config.ts`. |
| SM-3 | Reloading or deep-linking a game locks the coach out of editing | P0 | _No spec needed — no visual surface. The fix is loading team context (or returning the caller's role on the game detail response); nothing new is rendered._ | **Pain:** "My phone locked during the second quarter. When I opened it back up the game was read-only and I could not record anything." **Detail:** `GameDetailPage` derives `isCoach` from `teamStore.currentTeam`, which is only ever populated by `TeamDetailPage.fetchTeam`. Any fresh load of `/games/:gameID` — refresh, PWA relaunch, bookmark, shared link — leaves `currentTeam` null, so `isCoach` is false: the Live Track toggle vanishes and every box score cell renders as static text. The backend authorizes correctly (`requireCoach` in `usecase/helpers.go`), so this is purely a frontend gating bug and the writes would have been accepted. **Why:** happens the first time a phone sleeps mid-game, which is every game. **Note for the Designer:** there is no visual surface here — the fix is loading team context, or returning the caller's role on the game detail response. Pass it straight to Ready for Dev with no spec. **Files:** `frontend/src/pages/teams/GameDetailPage.tsx`, `frontend/src/stores/teamStore.ts`. |

## In Progress
| ID | Title | Owner | Branch | Notes |
|---|---|---|---|---|

## In Review
| ID | Title | PR | Notes |
|---|---|---|---|

## Blocked
| ID | Title | Why | Proposed alternative |
|---|---|---|---|

## Done
| ID | Title | Shipped | Notes |
|---|---|---|---|

---

## Decision log
_Append-only. Record why a card was killed, deferred, rescoped, or pushed back on._

| Date | Card | Decision | Rationale |
|---|---|---|---|
| 2026-08-31 | — | First full product audit. Read every page under `frontend/src/pages/`, the stores, `vite.config.ts`, and the games and teams backend slice end to end. Eight cards opened, SM-1 through SM-8. | Games and live stat tracking are the newest and least polished surface, and they are also the coach's game-day loop. Six of eight cards land there. The audit deliberately spent less time on playbooks and the Konva editor, which are older and stable. |
| 2026-08-31 | SM-1, SM-2, SM-3 | Ordered the three P0s by how often they hurt, not by size of fix. | All three lose data. SM-1 loses it on every possession of every game, so it goes first even though SM-3 is a far smaller change. If the Developer wants to land SM-3 first as a quick unblock, that is fine — it does not conflict with SM-1. |
| 2026-08-31 | Deferred | Delete Team hardening. | `Delete Team` is a full-size danger button at the top of the team page guarded only by `window.confirm`, and it cascades to every game, stat, playbook and play. Real, but a coach does it at most once a season and a confirmation does exist. Revisit after the P0s. |
| 2026-08-31 | Deferred | MIN and +/- cannot be captured in live mode. | Both columns exist in the box score as manual number entry with no live equivalent, because filling them honestly requires substitution and clock tracking — a much larger build than the current panel. Not worth opening until SM-1 makes the live path trustworthy. |
| 2026-08-31 | Deferred | Two competing invite paths on the roster tab. | The tab shows both a per-slot `Invite` button and a standing `InviteForm` at the bottom, which do subtly different things — one links the invite to a roster slot, one does not. Confusing, not blocking. Fold into SM-6's design pass rather than carrying its own card. |
| 2026-08-31 | Deferred | Box score export or share with parents. | Coaches do send box scores out, but the shape of it is speculative until SM-7 establishes what the aggregate data model looks like. |
| 2026-08-31 | Not opened | `GET /api/games/:gameID` performs writes. | `GetGameDetail` re-seeds `game_players` on every read, one INSERT per member in a loop. Invisible to the coach and currently correct, so it is not a product card. Flagged here so the Developer can fold the cleanup into whichever games-side card they touch first. |
| 2026-08-31 | Not opened | Google OAuth, schedule management, push notifications, additional sports. | Already tracked in `TODO.md` under Post-MVP. Not duplicating them onto this board. |

---

## CEO REVIEW (Phase 1) — SELECTIVE EXPANSION

Reviewed `docs/KANBAN.md` (SM-1..SM-8) at commit 378b569, branch `feature/#13`.
Codex: unavailable (binary not found). Outside voice: Claude subagent only `[subagent-only]`.

### Section 1 — Architecture (3 findings)

Stat write path as built:

```
  LivePanel tap
      |
      v
  handleLiveAction(memberID, action)         GameDetailPage.tsx
      |  reads currentGame.players.find(...)  <-- STALE during any in-flight write
      v
  applyLiveStat(stats ?? emptyStats())        computes an ABSOLUTE 17-col line
      |
      v
  gameStore.upsertStats --await--> PUT /api/games/:id/stats/:memberID
      |                                  |
      |                                  v
      |                    requireCoach -> UpsertStats
      |                    INSERT .. ON CONFLICT DO UPDATE SET <all 16 cols>
      |                    last-write-wins, no version, no updated_at
      v
  set({ currentGame })  -- ONLY after the round trip returns
```

Shadow paths:

| Path | Behaviour today | Verdict |
|---|---|---|
| Happy | Tile updates after RTT (200ms-5s on gym wifi) | Laggy, not wrong |
| Nil | `stats ?? emptyStats()` writes a full zero line | GAP — the SM-2 amplifier |
| Empty | `players: []` renders an empty grid, no empty state | GAP (cosmetic) |
| Error | `void onSaveStats(...)`, floating promise, no UI, no log | CRITICAL GAP |

There is no state machine for a stat value. It has two states (rendered, in-flight) and
no representation for pending / failed / conflicted. SM-1's design introduces that
vocabulary; the store has nowhere to put it.

Unjustified coupling: `GameDetailPage` depends on `teamStore.currentTeam` only to compute
`isCoach`, and nothing on that route populates it. That IS the SM-3 bug. The server
already answers this question correctly.

Scaling: `GetGameDetail` issues 4 sequential round trips per read and performs a WRITE on
a GET, which makes `GET /api/games/:id` uncacheable — exactly what SM-1 needs it to be.

Rollback: frontend cards revert cleanly. Reversibility 4/5.

### Section 2 — Error & Rescue Map (4 CRITICAL GAPS)

```
  CODEPATH                           | WHAT CAN GO WRONG    | SURFACED AS
  -----------------------------------|----------------------|--------------------------
  handleLiveAction                   | offline              | unhandled rejection
                                     | 401 expired          | redirect, loses game context
                                     | 403 (stale role)     | unhandled rejection
                                     | 5xx / malformed      | unhandled rejection
  handleStatChange (void onSaveStats)| any of the above     | swallowed entirely
  toggleDNP                          | request retried      | double flip, silent no-op
  fetchGameDetail                    | any failure          | spinner forever
  updateGame (window.prompt)         | any failure          | silent
```

| Error | Rescued? | Action | User sees |
|---|---|---|---|
| ApiError 401 | Y | `onUnauthorized` | redirect (loses game) |
| ApiError 403 | N — GAP | none | nothing |
| ApiError 5xx | N — GAP | none | nothing |
| Network failure | N — GAP | none | nothing |
| Malformed response | N — GAP | none | nothing |

Four unrescued classes on the hottest path in the product. Backend handlers log nothing,
so a failed write leaves no trace on either side of the wire.

### Section 3 — Security (2 findings, 0 High)

Authorization is the strong part and should be left alone. `requireCoach` gates every
mutation, `requireMember` every read, both resolved from the DB per request. No IDOR:
`UpsertStats` scopes by `gp.game_id = $1 AND gp.team_member_id = $2`.

| Threat | Likelihood | Impact | Mitigated? |
|---|---|---|---|
| Unvalidated stat magnitude — `parseInt` accepts negatives; no clamp client or server; columns are plain INT with no CHECK | High | Low-Med | No |
| No rate limit on stat writes; SM-1's retry queue turns one stuck client into a write loop | Med | Med | No |

### Section 4 — Data Flow & Interaction Edge Cases (11 mapped, 9 unhandled)

| Interaction | Edge case | Handled? |
|---|---|---|
| Live stat tap | double tap same player | NO — lost write |
| | tap while offline | NO — silent loss |
| | tap, then phone sleeps | NO — SM-3 read-only on wake |
| Box score cell | blur with empty input | PARTIAL — NaN reverts |
| | negative / huge value | NO — accepted and persisted |
| | two cells edited fast | NO — whole-line PUT, last wins |
| DNP toggle | mis-tap | NO — wipes line, no confirm, no undo |
| | retried request | NO — `NOT is_dnp` flips twice |
| Game load | fetch fails | NO — infinite spinner |
| | zero players | NO — no empty state |
| Score entry | `window.prompt` | PARTIAL — blocks, unstyled, no keypad |

### Section 5 — Code Quality (4 findings)

- `emptyStats()` is conceptually duplicated by the DB defaults and by `applyLiveStat`.
- `applyLiveStat` is a clean pure function and the natural seam for SM-1's queue. Use it.
- Button semantics are ambiguous: `+2 PT` already increments fgm/fga, and `FG ✓` does the
  same without points. Tapping both double-counts an attempt. Not on the board.
- `mins` and `plus_minus` are editable columns live mode can never populate — dead UI.

### Section 6 — Test Review (3 gaps — the largest in this review)

| Layer | Coverage |
|---|---|
| Frontend | Zero. No test runner at all — no `test` script, no vitest/jest, no test files |
| Backend usecase | 2 tests, both `CreateGame` |
| `UpsertStats`, `ToggleDNP`, `GetGameDetail` | Zero |
| Handlers, repository | Zero |

SM-1 and SM-2 are data-integrity fixes to frontend state logic in a repo with no frontend
test harness. They cannot be verified, only demoed. The 2am-Friday test — "fire 20 taps at
one player on throttled 3G, assert the server line equals 20 increments" — is currently
impossible to write.

### Section 7 — Performance (2 findings)

- `GetGameDetail`: 4 sequential round trips plus a write per read.
- No N+1 in the SQL itself; players+stats come back in one joined query.
- Indexes adequate for SM-7's aggregation.
- SM-1's queue needs a retry cap and backoff or a dead phone becomes a write storm.

### Section 8 — Observability (2 gaps)

No logging in handlers, no metrics, no traces, no alerts. If a coach reports "my stats
vanished in the third quarter" three weeks from now, it cannot be reconstructed.

### Section 9 — Deployment (3 risks)

- Migrations 007-009 are additive except 009, which drops a constraint and a NOT NULL.
- Retrospective smell: commit f35d552 is "fix: drop unique constraint correctly in
  migration 8". Migration 009 repeats the pattern, dropping a constraint by hard-coded
  generated name. Any new migration here should drop by lookup.
- No feature flags anywhere. SM-1 changes the core game-day loop with no way to turn it
  off mid-season.

### Section 10 — Long-Term Trajectory (2 debt items, reversibility 4/5)

The plan as written layers a retry queue over an absolute-value last-write-wins API. Every
future feature (multi-scorekeeper, live sharing, undo history) gets harder while the write
endpoint stays non-idempotent.

### Section 11 — Design & UX (5 findings)

- The score leads the screen, which is right, but it is a lie until SM-4 lands.
- State coverage: loading YES, empty NO, error NO, success NO, partial NO.
- `window.prompt` for opponent score ignores the design system and gives no numeric keypad.
- The DNP control has the highest damage-per-pixel in the app: a bare `text-xs` button
  inline with the player's name, no confirmation, no undo, destroys data.
- Contrast on `text-foreground/30` and `/40` is below 4.5:1 on the midnight background.

### CEO DUAL VOICES — CONSENSUS TABLE

```
  Dimension                              Claude    Outside   Consensus
  -------------------------------------- --------- --------- -----------
  1. Premises valid?                     NO        NO        CONFIRMED
  2. Right problem to solve?             PARTIAL   NO        CONFIRMED
  3. Scope calibration correct?          NO        NO        CONFIRMED
  4. Alternatives explored?              NO        NO        CONFIRMED
  5. Competitive/market risks covered?   NO        NO        CONFIRMED
  6. 6-month trajectory sound?           NO        NO        CONFIRMED
```

6/6 CONFIRMED, 0 disagreements on dimensions. Both voices independently reached:
the stat-keeper premise is untested and load-bearing; SM-3 is a prerequisite not a
parallel win; the absolute-value write model is the shared root cause of SM-1 and SM-2;
`GetGameDetail` writing on a GET gets worse once SM-1 lands; the board has no competitive
position. The outside voice went further on the fix (an append-only event log with a
unique client event id, deriving the box score) and raised four items the primary review
did not: kill the mid-game retry sheet, derive rather than store `team_score`, promote a
shareable recap to P1, and merge SM-6 with SM-8.

### NOT in scope

| Item | Rationale |
|---|---|
| Rewriting the playbook / Konva editor | Stable, and outside the backlog under review |
| MIN and +/- live capture | Needs substitution and clock tracking; PM deferred, correctly under the current model |
| Google OAuth, schedule, push, more sports | Already tracked in `TODO.md` |
| Box-score export | Deferred pending the data model question |

### What already exists

| Sub-problem | Existing code | Reuse |
|---|---|---|
| Offline game reads | `vite.config.ts` runtimeCaching, same shape for teams/playbooks/plays | High |
| SM-3 coach gating | `teamStore.fetchTeam` exists; server-side `requireCoach`/`requireMember` correct | Very high |
| Season aggregates | None, but `game_stats` holds every column needed | Moderate |
| Team score | `UpdateGame` exists; blocker is `COALESCE` | High |
| Optimistic queue | Nothing | New build |

### Dream state delta

CURRENT: a coach can create a game, tap stats that may or may not persist, and see a box
score that ends there. No record, no history, no trust.
THIS PLAN: the taps land, nothing gets wiped, it survives a phone sleep, and W/L becomes
real.
12-MONTH IDEAL: stat capture is a boring trusted substrate and the value has moved up to
what the data enables — playbook-to-outcome linkage, a player/parent-facing season page,
multi-sport by schema.

Delta: the plan moves decisively on the trust axis and one step (SM-7) on the value axis.
It does not address who else can enter data, or who ever reads it.

### Failure Modes Registry

| Codepath | Failure mode | Rescued? | Test? | User sees | Logged? |
|---|---|---|---|---|---|
| `handleLiveAction` | network failure | N | N | Silent | N | **CRITICAL GAP** |
| `handleStatChange` | any error | N | N | Silent | N | **CRITICAL GAP** |
| `toggleDNP` | retry double-flip | N | N | Silent | N | **CRITICAL GAP** |
| `toggleDNP` | client nulls stats | N | N | Zeros | N | **CRITICAL GAP** |
| `fetchGameDetail` | fetch fails | N | N | Infinite spinner | N | **CRITICAL GAP** |
| `UpsertStats` | concurrent write | N | N | Lost stat | N | **CRITICAL GAP** |
| `UpdateGame` | COALESCE blocks null | N | N | Cannot clear score | N | |

7 failure modes, 6 CRITICAL GAPS.
