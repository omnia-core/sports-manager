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


## Stated premises

_Added 2026-09-01 after the `/autoplan` review found the board's load-bearing assumption was never written down. Challenge these before building on them._

| # | Premise | Status | Consequence if wrong |
|---|---|---|---|
| P1 | The head coach personally taps stats during live play, on a phone, one-handed | **UNVALIDATED — see SM-12** | `requireCoach` gates every stat write, so a manager or parent keeping the book has no way in. SM-1 and SM-5 would be optimizing a workflow nobody performs |
| P2 | Coaches want per-game box scores enough to tap ~200 events | Assumed | SM-7 is the payoff; until it exists, tracking is write-only |
| P3 | This is a winnable fight against GameChanger and Hudl on stat entry | **UNEXAMINED** | The differentiator in this repo is the playbook + Konva editor, not stats. See SM-11 |
| P4 | A game session fits inside one auth token | **FALSE — see SM-9** | Verified: token is 60 min, a game with warm-up is 90-120 min |

---

## Backlog
_PM-owned. Prioritized, not yet designed._

| ID | Title | Priority | Type | Notes |
|---|---|---|---|---|
| SM-11 | A coach cannot share a game recap with anyone | P1 | feature | **Pain:** "I finished the box score and there is nobody to send it to." **Why:** the growth loop. A coach posts a recap, twelve families see the app, one of them coaches another team. Also the only card on the board that serves anyone other than the coach. **Scope:** a public read-only game link. No auth, no sync, no undo — smaller than SM-1. **Rescoped 2026-09-01:** dependency on SM-7 removed; a per-game recap needs no aggregate model. |
| SM-6 | First run gives a new coach a blank screen and then a form they must submit 15 times | P1 | ux | **Merged with the former SM-8 on 2026-09-01.** They are one problem: a coach who abandons at the empty screen never reaches the roster form, so the empty state gated a card ranked above it. **Scope:** zero-team empty state with the CTA where the eye lands; a first-run path that names step one after team creation; `AddRosterForm` stays open and refocused after each save; bulk/paste entry; and the duplicate invite paths resolved. **Design owes:** input format, malformed-row handling, partial success, duplicate jersey numbers. Larger than its papercut label. |
| SM-7 | A coach cannot see any player's totals or averages across games | P1 | feature | **Pain:** "I have logged eight games and I still cannot tell you what Marcus averages." **Why:** it is the reason to log stats at all. **Scope guard:** per-player season totals and averages plus a team W/L record. Not charts, not splits. **Largest card on the board** — full backend vertical slice plus a new screen with no design. **Design owes:** phone layout, empty state under two games, partial-season handling, and whether DNP games count in the averages denominator. |
| SM-12 | Nobody has confirmed who actually keeps the book | P2 | research | **Pain:** the board assumes the head coach taps stats mid-game while also coaching. **Why:** premise P1 is load-bearing for SM-1 and SM-5 and has never been tested. `requireCoach` in `usecase/helpers.go` forecloses the alternative. **Scope:** ask five coaches who keeps their book. If it is a manager or parent, open a `scorekeeper` role card — `models.RoleCoach` is already an enum, so it is one migration value and one branch in `requireCoach`. |

## Ready for Design
_Designer picks the highest-priority card here._

| ID | Title | Priority | Type | Notes |
|---|---|---|---|---|
| SM-1 | Live stat taps are silently lost on gym wifi and on fast taps | P0 | bug | **Rescoped 2026-09-01. The existing spec at `docs/design/SM-1-live-stat-reliability.md` needs revision before build.** Sequenced last of the P0s: it depends on SM-9 (session survives the game), SM-3 (coach can edit after a reload), SM-2 (the queue would otherwise fire SM-2's wipe automatically) and SM-13 (the write endpoint can express what the UI promises). **Spec revisions required:** (1) the resting sync state occupies zero persistent chrome — move `Saved 7:41 PM` into the live panel header; the strip appears only for offline/failed/real backlog, as an overlay that does not reflow the page; (2) move the undo control to the panel header at 44px — a 56px destructive control directly under the button grid the coach hammers blind recreates SM-2's bug class inside the card meant to prevent it; (3) delete the pending dot and the amber box-score border, keep the failed ring; (4) the Unsaved Stats sheet becomes one screen, one action — read-only evidence list plus `Retry all`, no per-row Discard; (5) fix the layering — `LivePanel` z-40, strip z-45, `Modal` z-50, and the strip renders inside `Layout`'s nav row, since `Layout` has no `fixed`/`sticky`/`z-*` and the specced `pt-12` pads the wrong element; (6) stop describing `navigator.vibrate` as load-bearing — it is unimplemented on iOS Safari including installed PWAs. **Added to scope:** the server/pending store split (`serverStats` + `pendingEvents[]`, rendered line derived); `fetchGameDetail` stops nulling `currentGame` on refetch; a load-failure state with retry; queue persistence keyed by `(userID, gameID)`; and the SM-14 cache work. |
| SM-5 | The live stat panel covers the roster, costing 3 taps per stat event | P1 | ux | **Promoted ahead of SM-1's UI work 2026-09-01.** `LivePanel` is `fixed inset-0`, so the grid underneath is untappable and switching players is close -> find -> tap -> stat, 4-6 times per possession. `mode` is React state that resets to Box Score on every load. Fixing reliability of a loop that is still the wrong loop produces "it's still too slow to keep up, but now it tells me it saved." **Constraint from the SM-1 spec:** undo must stay attached to the stat-button cluster and reachable in zero taps. |

## Ready for Dev
_Build in the order listed. Each row blocks the ones below it._

| ID | Title | Priority | Spec | Notes |
|---|---|---|---|---|
| SM-3 | Reloading or deep-linking a game locks the coach out of editing | P0 | none needed | **Rescoped 2026-09-01: not a frontend-only fix.** `isCoach` derives from `teamStore.currentTeam`, which only `TeamDetailPage` populates, so any refresh, PWA relaunch or shared link renders the game read-only. **Preferred fix: return the caller's role on `GetGameDetailResponse`.** `requireMember` in `usecase/helpers.go:15` already calls `GetMembership` and throws the role away; returning it costs one field. The frontend-only alternative (`fetchTeam(game.team_id)`) needs a second serial round trip and a second cached route, which breaks SM-1's offline cold-load path. **Why second:** it gates SM-1's headline recovery scenario — the spec says so itself in §5.9. |
| SM-2 | Marking a player DNP wipes their stat line, permanently | P0 | none needed | **Moved ahead of SM-1 on 2026-09-01.** `gameStore.toggleDNP` sets `stats: is_dnp ? null : p.stats`, so toggling back returns zeros, and the next box-score edit builds from `emptyStats()` and PUTs an all-zero line the upsert commits over real numbers. **Core fix is one line:** `stats: p.stats` unconditionally. **Why before SM-1:** SM-1's queue recomputes absolute lines from local state, so after SM-1 this sequence destroys a row with no further input — tap +2 (queued), mis-tap DNP (local stats null), queue retries from `stats ?? emptyStats()`, commits zeros over 18 points. **Also owes:** a loading and error state on `toggleDNP` (currently an awaited call with neither), and a target size and placement that is not a bare `text-xs` button beside the player's name. |
| SM-10 | There is no way to verify any of these fixes | P1 | none needed | **NEW 2026-09-01.** `frontend/package.json` has no test script, no vitest, no jest, no testing-library, and there are zero test files under `frontend/src`. SM-1 and SM-2 are data-integrity fixes to frontend state logic, so as things stand they can be demoed but not verified. Backend has two tests, both on `CreateGame`; `UpsertStats`, `ToggleDNP`, `GetGameDetail`, the whole repository layer and all handlers are untested, and CI provisions a Postgres container nothing uses. **Scope:** add vitest + testing-library, wire `npm run test` into `.github/workflows/frontend.yml`, extract `applyLiveStat` and `emptyStats` out of `GameDetailPage.tsx` into a testable module. **Full plan:** `docs/test-plans/games-live-stats-test-plan.md`. **Also port in:** the six behavioural checks written for SM-14 (`src/api/cache.ts` — user switch purges, same user keeps, unknown owner purges, logout purges and clears the owner, a later runtime cache is purged too, denied storage does not throw). They were run out-of-tree against the compiled module with stubbed `caches`/`localStorage` because no runner exists yet, so that fix is currently unguarded against regression. |
| SM-13 | The stat write endpoint cannot express what SM-1's UI promises | P0 | none needed | **NEW 2026-09-01.** `PUT /stats/:memberID` takes all 16 columns absolute with `ON CONFLICT DO UPDATE SET ... = EXCLUDED.*` (`game_repository.go:202`), last-write-wins, no version column. SM-1's spec simultaneously requires per-action retry, per-action discard and per-action undo **and** per-player collapse to an absolute line — mutually exclusive. **Fix:** `POST /api/games/{gameID}/stats/{memberID}/events` taking `{event_id, delta}`; one transaction inserting the event with `ON CONFLICT (event_id) DO NOTHING` and, when a row is inserted, incrementing `game_stats`. Returns the resulting absolute line. Buys retry-safety, reorder-safety, concurrency-safety and per-action identity at once. Keep the absolute PUT for the box score, where whole-line replacement is the real intent. **Also fold in:** stat input validation (reject negatives, cap ceilings, reject `fgm > fga`), and replace the `SeedGamePlayers` per-member loop in `GetGameDetail` with one `INSERT ... SELECT ... ON CONFLICT DO NOTHING`. |
| SM-4 | Team score is never saved, so no game ever gets a result | P1 | none needed | **Rescoped and promoted 2026-09-01.** `gameResult()` returns `—` whenever `team_score` is null and nothing ever writes it, so every game shows a dash and the team has no W/L anywhere. **Do not store `team_score`. Derive it** from the box score and store only `opponent_score`, which cannot be derived. That removes the column, the `COALESCE`-can-never-clear bug, and the drift where a stored score silently disagrees with the box score below it. Add `team_score_override` only if a coach needs to record a game they did not track. **Also:** replace the `window.prompt` opponent-score entry with a `Modal` and a numeric keypad, and format `game_date` instead of rendering the raw `2026-08-31` string. **Why here:** two voices independently placed the payoff ahead of SM-1 — reliability of a loop that produces no visible result is the least valuable ordering available. |

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
| SM-9 | The coach is force-logged-out mid-game | 2026-09-02 ([#20](https://github.com/omnia-core/sports-manager/pull/20)) | Branch `fix/#19`. Single-flight refresh + replay in `frontend/src/api/client.ts`; one file, no backend change. Refresh is shared across concurrent 401s because the backend rotates and single-uses refresh tokens (`ValidateAndDeleteRefreshToken`), so a second concurrent refresh would clear the cookies and cause the very logout being fixed. **Deviation for review:** `/api/auth/me` is refreshable, against the card text — see the decision log. Verified by lint + build plus a throwaway esbuild/node harness driving the real module (35 assertions, 8 scenarios, all passing). **Not covered by CI** — SM-10 should port those cases. |
| SM-14 | Cached data can outlive the session that fetched it on a shared device | 2026-09-02 ([#24](https://github.com/omnia-core/sports-manager/pull/24)) | Mechanism, now that it is fixed: the three `NetworkFirst` runtime caches in `vite.config.ts` are keyed by URL alone and nothing ever cleared them, so on a shared device a later session could be served an earlier one's responses whenever the 5s network timeout elapsed. Fix treats sign-in and sign-out as cache boundaries — purge every non-precache CacheStorage entry on logout and on an unrecoverable 401, and on sign-in whenever the user differs from the last one this device cached for. Same-user sign-in keeps the cache, so offline reads survive. Purging everything but the precache rather than an `api-*` allowlist means SM-1's game data is covered for free. |

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

| 2026-09-01 | SM-1, SM-2, SM-3, SM-9, SM-13 | **Build order reversed.** Was SM-1 -> SM-2 -> SM-3. Now SM-9 -> SM-3 -> SM-2 -> SM-10 -> SM-13 -> SM-4, with SM-1 last. | `/autoplan` review, approved by the human at the gate. Three independent voices reached the same conclusion without shared context. SM-3 gates SM-1's own headline recovery path (the SM-1 spec says so in §5.9). SM-2's mis-tap becomes automatic, no-further-input data loss once SM-1's queue recomputes absolute lines from local state. The prior rationale — order by how often each hurts — is the wrong axis when severity and recoverability differ, and it missed that the three cards collide in the same two files. |
| 2026-09-01 | SM-9 | **Opened. Not found by the original audit.** Access token is 60 minutes; the frontend never calls `/api/auth/refresh`. | Verified in `backend/internal/auth/jwt.go:15` and `frontend/src/api/auth.ts`. Found independently by two of three review voices from different directions, which makes it the highest-confidence finding in the review. A game with warm-up exceeds the token lifetime, so the coach is ejected to `/login` mid-game, every game. |
| 2026-09-01 | SM-13 | **Opened.** The absolute 17-column PUT is the shared root cause of SM-1 and SM-2, not two separate bugs. | The SM-1 spec requires per-action retry, discard and undo while also requiring per-player collapse to an absolute line. Those cannot both hold. A delta write with a client-supplied `event_id` and `ON CONFLICT DO NOTHING` buys retry-safety, reorder-safety, concurrency-safety and per-action identity in one migration, and is smaller than the client-side collapse machinery plus shadow action log the alternative needs. |
| 2026-09-01 | SM-10 | **Opened.** No frontend test infrastructure exists at all. | `frontend/package.json` has no test runner and there are zero test files. SM-1 and SM-2 are data-integrity fixes to frontend state logic, so without this they can be demoed but not verified. Treated as blocking rather than follow-up by two voices. |
| 2026-09-01 | SM-4 | **Rescoped and promoted.** Derive `team_score` instead of storing it; moved ahead of SM-1. | Storing it creates two sources of truth for one number — the header already renders `game.team_score ?? teamScore`, so once set, later stat corrections stop moving it. Deriving deletes the column, the `COALESCE` bug and the drift together. Promoted because the arc the board produced was friction -> reliability -> forced logout -> no payoff. |
| 2026-09-01 | SM-6, SM-8 | **Merged.** SM-8 folded into SM-6. | They are one first-run problem, and SM-8 at P2 sat behind a P1 card it gates: a coach who abandons at the empty screen never reaches the roster form. |
| 2026-09-01 | SM-11 | **Opened, dependency on SM-7 removed.** | The prior log deferred a share/export card as "speculative until SM-7 establishes the data model." Backwards: a per-game recap link needs no aggregate model, is smaller than SM-1, and is the only item on the board that serves anyone other than the coach. |
| 2026-09-01 | SM-12 | **Opened.** Premise P1 written down and marked unvalidated. | The board assumed the head coach taps stats during live play and never stated it. `requireCoach` gates every stat write, so if a manager or parent keeps the book they have no way in. Amendment is to check the premise with five coaches, not to build the role now. |
| 2026-09-01 | SM-1 | **Spec revision required before build.** Four of five proposed surfaces trimmed. | The always-on 48px strip spends permanent chrome saying nothing is wrong; the 56px undo bar sits directly under the button grid the coach hammers blind, recreating SM-2's bug class inside the card meant to prevent it; the pending dot is argued against by the spec itself in §5.6; per-row Discard is queue administration during live play. Also corrected: `Layout` has no `fixed`/`sticky`/`z-*`, so the specced strip covers the nav and `pt-12` pads the wrong element, and `navigator.vibrate` is unimplemented on iOS Safari. |
| 2026-09-01 | Not opened | `bun` and `jq` are missing on this machine. | `gstack-review-log` shells out to `bun -e`, so no review was logged and `/ship`'s readiness dashboard will show zero runs. `jq` absence blocks the per-phase task JSONL. Tooling, not product — recorded so the next session does not re-diagnose it. |
| 2026-09-01 | SM-9 | **Built as specified, with one deviation: `/api/auth/me` refreshes on 401 rather than being excluded.** | The card excluded `me` along with `login`/`refresh` to avoid a loop. There is no loop — the refresh call is a bare `fetch` rather than routed through the client, and each request refreshes at most once. Excluding `me` would have defeated a scenario the card exists to fix: on a page reload or PWA relaunch mid-game the access token is expired but the refresh token is valid, and `init()` calls `me()` first, so the coach would still be logged out on reload. Cost is one extra 401'd request per anonymous page load. `login`, `register`, `logout` and `refresh` are excluded as specified. |
| 2026-09-01 | SM-9 | **Single-flight recorded as a correctness requirement, not a performance one.** | `usecase/auth_usecase.go` rotates and single-uses refresh tokens via `ValidateAndDeleteRefreshToken`, and `handlers/auth_handler.go` clears both cookies when a refresh fails. Two concurrent refreshes therefore log the user out. Anything later that adds a second refresh path — SM-1's retry queue is the obvious candidate — must route through the shared promise in `client.ts` rather than calling the endpoint itself. |
| 2026-09-01 | SM-9 / SM-10 | **Shipped frontend logic that CI does not cover, stated rather than glossed.** | The refresh path was verified by bundling the real `client.ts` with esbuild and driving it against a stubbed `fetch` (35 assertions, 8 scenarios). That harness is a scratchpad throwaway; bootstrapping vitest is SM-10's scope and expanding into it here was declined. SM-10 should port the eight cases: single-flight under N concurrent 401s, refresh failure preserving prior behaviour, auth-path exclusion, method/body/credentials preservation on replay, no double refresh on a re-401, non-401 passthrough, the in-flight straggler, and an offline refresh. |
| 2026-09-02 | SM-14 | **Fixed and disclosed.** Mechanism written into the card now that PR #24 carries the fix. | The card deliberately withheld the mechanism while it was unfixed. The PR discloses it by necessity, so keeping the board vague past that point only costs the next reader context. |
| 2026-09-02 | SM-10 | **Scope grew by six cases.** SM-14's verification was run out-of-tree and needs porting in. | Second data-integrity fix in a row that can be demonstrated but not regression-guarded. The gap SM-10 describes is now concrete rather than anticipated. |


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

---

## DESIGN REVIEW (Phase 2)

Codex unavailable. Outside voice: Claude subagent `[subagent-only]`.
Design completeness: **4/10 -> 7/10** with the fixes below.

### Pass scores

| Pass | Score | Finding |
|---|---|---|
| 1. Information architecture | 5/10 | Hierarchy specified for one screen only. SM-7 and SM-8 each create a new screen with none. SM-1 puts a sync bar at position zero on the most time-critical screen in the product |
| 2. Interaction states | 3/10 | SM-1 covers all five. The other seven cards cover none. SM-7's empty state IS the feature for a new coach; SM-8 is an empty-state card with no copy |
| 3. User journey | 6/10 | Pain written in the coach's voice, but the arc is friction -> reliability -> forced logout -> no payoff |
| 4. AI slop | 7/10 | APP UI. Live grid is cards-as-layout but passes: the card IS the tap target. `window.prompt` is absence of design, not slop |
| 5. Design system | 6/10 | Palette has no warning/danger token, so SM-1 had to invent amber and red. `Badge` already ships `red`/`yellow` (CLAUDE.md is stale) - promote to tokens once |
| 6. Responsive & a11y | 5/10 | SM-1 strong. 48 uses of sub-4.5:1 `text-foreground/20\|30\|40` across the frontend; box-score stat inputs are 36px targets on the primary correction surface |

### CRITICAL - not on the board

`AccessTokenTTL = 60 * time.Minute` (`backend/internal/auth/jwt.go:15`) and the frontend
never calls `/api/auth/refresh`. `client.ts:22` fires `onUnauthorized` on any 401, clearing
the session and redirecting to `/login`. A game with warm-up is 90-120 minutes, so the coach
is forcibly logged out mid-game, losing any in-memory queue SM-1 builds.

Fix: transparent refresh in `client.ts` (on 401, try `POST /api/auth/refresh` once, replay
the request, fall through to `onUnauthorized` only if refresh fails), and SM-1's queue must
survive an auth interruption regardless.

### Spec mechanics that are factually wrong against this codebase

- `Layout` has no `fixed`/`sticky`/`z-*`; its nav is in normal flow above `<main>`. A
  viewport-fixed `z-50` strip covers the nav, and the spec's `pt-12` pads the wrong element.
- `Modal` is `fixed inset-0 z-50`; `LivePanel` is `z-40`. The spec puts the strip at z-50
  and the Unsaved Stats sheet in a `Modal` - same layer, resolved only by DOM order.
  Explicit layering needed: LivePanel 40 -> strip 45 -> Modal 50.

### DESIGN DUAL VOICES - LITMUS SCORECARD

```
  Dimension                          Claude    Outside   Consensus
  ---------------------------------- --------- --------- ----------
  1. Information hierarchy right?    NO        NO        CONFIRMED
  2. Interaction states specified?   NO 3/10   NO        CONFIRMED
  3. User journey coherent?          NO        NO        CONFIRMED
  4. Specific vs generic UI?         PARTIAL   PARTIAL   CONFIRMED
  5. Design system alignment?        PARTIAL   NO        CONFIRMED
  6. Responsive & a11y?              PARTIAL   PARTIAL   CONFIRMED
  7. Unresolved decisions surfaced?  6 listed  7 ranked  CONFIRMED
```

7/7 CONFIRMED, 0 reviewer disagreements. Both reviewers disagree with the SM-1 spec on
four of its five proposed surfaces, and both independently place SM-4 ahead of SM-1.

### Unresolved design decisions

| Decision needed | If deferred |
|---|---|
| Local queue persistence: localStorage vs IndexedDB, keyed how, schema versioning | Hardest thing in SM-1, currently six words of "developer's call" |
| Delta PATCH vs client-side collapse | SM-1's only hard behaviour requirement (N taps = N increments) does not hold without it |
| Undo's compensating write against a last-write-wins API | Undo carries the identical lost-write hazard it exists to fix |
| Refetch reconciliation; `fetchGameDetail` sets `currentGame: null` and blanks the screen | Screen blanks mid-game on any refetch, including the PWA autoUpdate reload |
| Do DNP games count in SM-7's averages denominator? | A basketball correctness decision made by accident |
| SM-2 states: is a DNP line greyed or hidden? Does un-DNP refetch? | P0 with a described fix and zero states defined |
| SM-4: is team score computed, overridable, or both? | Schema decision, not UI; `COALESCE` blocks revert-to-computed |
| SM-6 bulk entry: format, malformed rows, partial success, duplicate jerseys | The card is labelled a papercut and is actually a roster IA redesign |

---

## ENG REVIEW (Phase 3)

Codex unavailable. Outside voice: Claude subagent `[subagent-only]`.

### Step 0 — Scope challenge

Four cards, two files. SM-1, SM-2, SM-3 and SM-5 all land in `GameDetailPage.tsx` and
`gameStore.ts`. The board records only the SM-1/SM-3 dependency.

| | `GameDetailPage.tsx` | `gameStore.ts` |
|---|---|---|
| SM-1 | `handleLiveAction`, `handleSaveStats`, `LivePanel`, `BoxScoreTable`, header | `upsertStats` — full rewrite |
| SM-2 | `BoxScoreTable` DNP button, `handleStatChange` | `toggleDNP` |
| SM-3 | `isCoach` derivation + mount effect | — |
| SM-5 | `LivePanel`, `LiveMode` | — |

SM-2 and SM-1 collide in `BoxScoreTable`/`handleStatChange` and both rewrite the same
`stats` field. The board's claim that they are independent is false.

**Hidden complexity — largest cards are not the ones marked P0.** SM-7 is the only full
backend vertical slice (domains -> usecase -> repository -> handler -> route -> client ->
store -> a new screen with no spec) and sits at P1 next to copy-and-layout cards. SM-6 is
labelled a papercut but absorbed the duplicate-invite-path cleanup, making it a roster IA
redesign. SM-1 itself is roughly 3x its apparent size once the store split, durable queue,
test infrastructure and token refresh are counted.

### Section 1 — Architecture

```
                    GameDetailPage.tsx  (444 lines, 5 components)
                   /          |          \
            gameStore     teamStore     authStore
                 |            |  ^
                 |            |  +-- SM-3: populated ONLY by TeamDetailPage
                 |            |        -> unjustified coupling; this IS the bug
                 +-----+------+
                  api/client.ts     credentials:include, 401 -> onUnauthorized
                       |            NO refresh call anywhere  <-- P0
                 game_handler.go    no logging, no input validation
                       |
                 game_usecase.go    requireCoach / requireMember  (SOUND)
                       |
              game_repository.go    UpsertStats: absolute 17-col PUT,
                                    ON CONFLICT DO UPDATE, no version column
```

**A1 (critical) — the spec's UI and the transport are incompatible.** SM-1 asks for
per-action retry, per-action discard and per-action undo, while also requiring the queue to
collapse per player into one absolute line so N taps equal N increments. Once collapsed
there is no "+2 PT for Marcus" item left to retry or cancel. The developer ends up
maintaining a shadow action log beside the collapsed line — two sources of truth, which is
the bug class this card exists to kill. The endpoint choice is not the developer's call;
the spec's own UI forces it.

**A2 (critical) — no separation between local truth and server truth.** `currentGame` is
the only stat state. `fetchGameDetail` sets `currentGame: null` then overwrites wholesale,
so any refetch (reconnect, back-navigation, PWA resume) blanks the page and discards every
optimistic value — after which the queue recomputes absolute lines from the reverted base
and writes the regression back to the server. The store needs `serverStats` +
`pendingEvents[]` with the rendered line derived.

**A3 (high) — writes are not serialized per player.** The browser allows 6 concurrent
requests per origin; two writes for the same `member_id` in flight can land out of order
and the older absolute line wins. That is the card's own bug, reintroduced inside the fix.

**A4 (high) — `GET /api/games/:gameID` writes, one INSERT per member, no transaction.**
~19 queries per game view at 15 players. A mid-loop failure leaves a partial roster and
500s a read. Replaceable with one `INSERT ... SELECT ... ON CONFLICT DO NOTHING`.

### Section 2 — Code quality

- `applyLiveStat` is the one clean pure function here and the natural seam for the queue.
  Extract it from the page before SM-1 changes it.
- `+2 PT` and `FG ✓` both increment `fgm`/`fga`; tapping both double-counts an attempt.
- `mins` and `plus_minus` are editable columns live mode can never populate.
- `emptyStats()` is duplicated in spirit by the DB defaults and by the store.

### Section 3 — Test review

Coverage today: frontend **zero, with no test runner at all**; backend two tests, both on
`CreateGame`; `UpsertStats`, `ToggleDNP`, `GetGameDetail`, the whole repository layer and
all handlers untested. CI provisions a Postgres 15 container that nothing uses.

Full test plan written to
`docs/test-plans/games-live-stats-test-plan.md`
(15 tests, 9 of them P1).

The merge-gating test: a pure queue-reducer unit test where the transport fails the first K
sends, delivers the rest out of order, and duplicates one — assert final server state equals
the exact sum of N actions, local state never decreased, and undo of action *i* removes
exactly action *i*. Under a delta endpoint with an idempotency key this passes trivially;
under absolute-PUT-plus-collapse it is the thing that fails.

### Section 4 — Performance

- A4's N+1 is the real amplifier, made worse by SM-1's reconnect refetches.
- A tap costs 3 queries; ~200 events per game is ~600 queries. Pool is 25. Load is not the
  pressure point.
- `NetworkFirst` with `networkTimeoutSeconds: 5` means that on the gym wifi this card is
  about, the page renders **from cache** — and the queue then computes absolute stat lines
  from a possibly hours-old base and writes them to the server. Caching `/api/games/*` as
  SM-1 requests introduces a new data-loss vector unless the write model changes.

### Additional confirmed defects not on the board

| # | Defect | Evidence |
|---|---|---|
| 1 | Access token expires at 60 min; frontend never calls `/api/auth/refresh` | `auth/jwt.go:15`; `api/auth.ts` has only register/login/logout/me |
| 2 | Failed game load is an infinite spinner | `fetchGameDetail` uses try/finally with no catch |
| 3 | No stat input validation | `upsertStatsBody` is 16 bare `int` fields; DB columns are plain INT |
| 4 | Client-side cache retention across sessions on a shared device | Tracked privately as SM-14; mechanism and repro deliberately not published while unfixed |
| 5 | `navigator.vibrate` is unimplemented on iOS Safari including installed PWAs | The spec calls the haptic its primary non-visual channel |

### ENG DUAL VOICES — CONSENSUS TABLE

```
  Dimension                          Claude    Outside   Consensus
  ---------------------------------- --------- --------- ----------
  1. Architecture sound?             NO        NO        CONFIRMED
  2. Test coverage sufficient?       NO        NO        CONFIRMED
  3. Performance risks addressed?    NO        NO        CONFIRMED
  4. Security threats covered?       PARTIAL   PARTIAL   CONFIRMED
  5. Error paths handled?            NO        NO        CONFIRMED
  6. Deployment risk manageable?     PARTIAL   —         N/A
```

5/6 CONFIRMED, 1 N/A, 0 disagreements.

### CROSS-PHASE THEMES

| Theme | Phases | Signal |
|---|---|---|
| Access token expires mid-game; no refresh on the client | Design + Eng, independently | **Highest-confidence finding in the review.** Two voices with no shared context reached it from different directions |
| The absolute-value write primitive is the shared root cause of SM-1 and SM-2 | CEO + Eng | Both propose an idempotent delta/event write before the queue UI |
| SM-1 must not be built first; SM-3 is a prerequisite | CEO + Design + Eng | All three voices, unprompted |
| SM-4 belongs ahead of SM-1 | CEO + Design | Reliability of a loop that produces no visible result is the least valuable ordering |
| No frontend test infrastructure exists | CEO + Eng | Both call it blocking, not follow-up |

### NOT in scope (Phase 3)

| Item | Rationale |
|---|---|
| Splitting `GameDetailPage.tsx` into modules | Do it as part of SM-1 + SM-5, not as its own card |
| Rate limiting stat writes | Deferred; retry cap and backoff cover the realistic case |
| Multi-device concurrent scorekeeping | Out of scope until the scorekeeper-role question is answered |

## Decision Audit Trail

| # | Phase | Decision | Class | Principle | Rationale |
|---|-------|----------|-------|-----------|-----------|
| 1 | 0 | Review target = `docs/KANBAN.md` | User | — | User selected option C at D1 |
| 2 | 0 | Checkpoint mode -> continuous | User | — | User selected option B at D2 |
| 3 | 0 | DX phase skipped | Mechanical | P3 | Only `API`(2)/`endpoint`(1) matched, all internal; no CLI/SDK/public API |
| 4 | 0 | `/office-hours` offer suppressed | Mechanical | P6 | autoplan One Gate rule; PM cards already carry structured problem statements |
| 5 | 1 | Mode = SELECTIVE EXPANSION | Mechanical | override | autoplan CEO-phase override |
| 6 | 1 | Approach B (bundle trust fixes) recommended | **Taste** | P2/P5 | Root-cause fix once vs three passes over the same files; overrides PM sequencing so it goes to the gate |
| 7 | 1 | Premise challenges queued, not auto-applied | Mechanical | override | Premises require human judgement at the gate |
| 8 | 2 | All 7 design dimensions run | Mechanical | P1 | Completeness |
| 9 | 2 | Spec surface trims (strip/undo/dots/discard) NOT auto-applied | **Taste** | P6 | Contradicts the designer's stated rationale; user decides |
| 10 | 3 | Test plan artifact written to disk | Mechanical | P1 | Required Phase 3 output |
| 11 | 3 | Scope never reduced | Mechanical | override | autoplan eng-phase override |
| 12 | all | Review logging skipped | Forced | — | `gstack-review-log` requires `bun`; not installed |
| 13 | all | Task JSONL skipped | Forced | — | `jq` not installed; skill forbids hand-rolling JSONL |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | 6 proposals, 0 accepted, 6 critical gaps |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | codex binary not installed |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open | 14 issues, 4 critical |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | score 4/10 -> 7/10, 8 decisions open |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | skipped | no developer-facing scope |

**CROSS-MODEL:** Codex unavailable on this machine, so all three outside voices ran as
independent Claude subagents `[subagent-only]`. Consensus: CEO 6/6, Design 7/7, Eng 5/6
confirmed with 0 disagreements. Two voices independently found the mid-game token expiry.

**VERDICT:** CEO + DESIGN + ENG CLEARED — approved at the gate on 2026-09-01. All 4 user
challenges and all 5 taste decisions accepted; the board has been amended and re-sequenced.
Note: `gstack-review-log` could not record these runs (`bun` not installed), so /ship's
readiness dashboard will show zero runs until that is fixed.

NO UNRESOLVED DECISIONS
