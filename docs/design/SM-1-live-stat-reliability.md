# SM-1 — Live stat reliability: instant feedback, honest save state, undo

**Card:** SM-1 · P0 · bug · *Live stat taps are silently lost on gym wifi and on fast taps*
**Surface:** `frontend/src/pages/teams/GameDetailPage.tsx` (`LiveMode`, `LivePanel`, `handleLiveAction`, `BoxScoreTable`), `frontend/src/stores/gameStore.ts`, `frontend/vite.config.ts`
**Author:** UI/UX Designer · 2026-09-01
**Status:** Ready for Dev

---

## 1. The problem

The coach is standing on the sideline with the phone in one hand. Marcus hits a two. He taps **+2 PT**. Nothing on the screen changes, because the app is waiting on a round trip through the gym's wifi before it will move a single number. So he taps again — and now the app has sent two writes that were both computed from the same stale line, and the second one quietly overwrites the first. When the write fails outright, nothing tells him. He finds out at the end of the quarter, when the numbers are wrong and there is no way to work out which ones. The app has asked him to trust it with the only thing he is doing on the sideline, and given him no evidence that it is working. What he needs is not a faster network. He needs the number to move the instant his thumb lands, a save state he can read at arm's length without stopping to look, a way to take back the tap he just fat-fingered, and the certainty that nothing he entered has silently evaporated.

---

## 2. The flow

### Primary loop — record a stat

1. Coach opens the game. (Already-open case: the app was left in Live Track; see §5.9.)
2. Taps **Live Track**.
3. Taps the player tile.
4. Taps **+2 PT** → **the tile and the panel header numbers change on this frame.** A short haptic fires. The Undo bar at the foot of the panel relabels to `↩ Undo +2 PT · Marcus Reed`.
5. Taps the next stat button for the same player. Repeats.

**Tap count for the primary action: 1 tap per stat event** once a player is selected (3 taps cold from a fresh Box Score view — 1 mode, 1 player, 1 stat). **SM-1 adds zero taps to this loop.** Every element this spec introduces is either always-visible (sync strip, Undo bar) or only appears in a failure path.

### Undo

1. Coach taps `↩ Undo +2 PT · Marcus Reed` in the panel footer. **1 tap.** No confirmation dialog.

### Failure recovery

1. Sync strip turns red: `2 stats not saved · Tap to fix`.
2. Coach taps the strip. **1 tap.**
3. Unsaved Stats sheet opens listing each failed action in plain language.
4. Coach taps **Retry all** (1 tap) — or **Retry** / **Discard** per row.

---

## 3. Layout

Two new regions. Nothing existing moves.

- **SYNC STRIP** — fixed to the top of the viewport, above everything including the live panel (z-50). Always present on `GameDetailPage` for a coach. 48px tall.
- **UNDO BAR** — the last row inside the live panel's button cluster. 56px tall.
- **PENDING DOT** — a state marker on individual player tiles and box-score rows. Not a new region.

### Mobile — 390px, Live Track, panel closed

```
┌────────────────────────── 390 ──────────────────────────┐
│▓▓▓▓▓▓▓▓▓ device status bar / safe-area-top ▓▓▓▓▓▓▓▓▓▓▓▓▓│
├─────────────────────────────────────────────────────────┤
│ SYNC STRIP  (fixed, z-50, h-48, full bleed)             │
│  ✓  Saved                                     7:41 PM   │
├─────────────────────────────────────────────────────────┤
│ HEADER                                                  │
│  ← Back                                                 │
│  vs Northgate Panthers                       54 — 49    │
│  Sat, Aug 30                             Set opp. score │
│                                                         │
│ MODE TOGGLE                                             │
│  ┌───────────┬───────────┐                              │
│  │ Box Score │▓Live Track│                              │
│  └───────────┴───────────┘                              │
├─────────────────────────────────────────────────────────┤
│ PLAYER GRID  (grid-cols-2)                              │
│  ┌───────────────────┐ ┌───────────────────┐            │
│  │ #12 Marcus Reed   │ │ #4 J. Ortiz     ● │ ← pending  │
│  │ 18 PTS 4 REB 3 AST│ │ 9 PTS  2 REB 1 AST│    dot     │
│  └───────────────────┘ └───────────────────┘            │
│  ┌───────────────────┐ ┌───────────────────┐            │
│  │ #7 D. Whitfield   │ │ #23 A. Nakamura   │            │
│  │ 6 PTS  1 REB 0 AST│ │ 11 PTS 7 REB 2 AST│            │
│  └───────────────────┘ └───────────────────┘            │
│              … 15-player roster scrolls …               │
├─────────────────────────────────────────────────────────┤
│ DNP ROW                                                 │
│  [ Chris Vance — tap to activate ]                      │
└─────────────────────────────────────────────────────────┘
```

### Mobile — 390px, live panel open

The panel is unchanged from today (`fixed inset-0`, sheet docked to the bottom) except for the **UNDO BAR** appended below the stat grid. The sync strip renders **above** the scrim so the coach never loses the save state while recording.

```
┌────────────────────────── 390 ──────────────────────────┐
│  ✓  Saved                                     7:41 PM   │ ← SYNC STRIP (z-50, above scrim)
├─────────────────────────────────────────────────────────┤
│░░░░░░░░░░░░░░░ scrim  bg-black/50 ░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ ╭─────────────────────────────────────────────────────╮ │
│ │ PANEL HEADER                                        │ │
│ │  Marcus Reed #12    20 PTS · 4 REB · 3 AST       ✕  │ │
│ │                                                     │ │
│ │ STAT GRID  (grid-cols-4, unchanged)                 │ │
│ │  ┌──────┐┌──────┐┌──────┐┌──────┐                   │ │
│ │  │+2 PT ││+3 PT ││ FT ✓ ││ FT ✗ │                   │ │
│ │  ├──────┤├──────┤├──────┤├──────┤                   │ │
│ │  │ FG ✓ ││ FG ✗ ││ 3P ✗ ││ ORB  │                   │ │
│ │  ├──────┤├──────┤├──────┤├──────┤                   │ │
│ │  │ DRB  ││ AST  ││ STL  ││ BLK  │                   │ │
│ │  ├──────┤└──────┘└──────┘└──────┘                   │ │
│ │  │ TOV  │┌──────────────┐                           │ │
│ │  └──────┘│ Foul (+1 PF) │                           │ │
│ │          └──────────────┘                           │ │
│ │ UNDO BAR  (h-56, full width of panel gutter)        │ │
│ │  ┌───────────────────────────────────────────────┐  │ │
│ │  │  ↩   Undo  +2 PT · Marcus Reed                │  │ │
│ │  └───────────────────────────────────────────────┘  │ │
│ ╰─────────────────────────────────────────────────────╯ │
│▓▓▓▓▓▓▓▓▓▓▓▓▓ safe-area-bottom padding ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└─────────────────────────────────────────────────────────┘
```

### Desktop — ≥1024px

The strip stops being a full-bleed bar and becomes an inline pill in the header row, right-aligned next to the score. The Undo bar stays inside the panel but sits beside the stat grid rather than under it, because vertical space is not the constraint at this size.

```
┌──────────────────────────────── 1280 ─────────────────────────────────────┐
│ NAV  Sports Manager                              Kevin Hwang   [ Logout ] │
├───────────────────────────────────────────────────────────────────────────┤
│ HEADER                                                                    │
│  ← Back                                                                   │
│  vs Northgate Panthers                    ┌──────────────┐    54 — 49     │
│  Sat, Aug 30                              │ ✓  Saved     │  Set opp.score │
│                                           └──────────────┘  ← SYNC PILL   │
│  ┌───────────┬───────────┐                                                │
│  │ Box Score │▓Live Track│                                                │
│  └───────────┴───────────┘                                                │
├───────────────────────────────────────────────────────────────────────────┤
│ PLAYER GRID  (grid-cols-4)                                                │
│  ┌────────────┐┌────────────┐┌────────────┐┌────────────┐                 │
│  │#12 M. Reed ││#4 J.Ortiz ●││#7 D.Whitfl.││#23 A.Nakam.│                 │
│  └────────────┘└────────────┘└────────────┘└────────────┘                 │
│  ┌────────────┐┌────────────┐┌────────────┐┌────────────┐                 │
│  │ …          ││ …          ││ …          ││ …          │                 │
│  └────────────┘└────────────┘└────────────┘└────────────┘                 │
└───────────────────────────────────────────────────────────────────────────┘

Panel open (desktop) — sheet is centred, max-w-2xl:
 ╭──────────────────────────────────────────────────────────╮
 │ Marcus Reed #12       20 PTS · 4 REB · 3 AST          ✕  │
 │ ┌──────┐┌──────┐┌──────┐┌──────┐   ┌───────────────────┐ │
 │ │+2 PT ││+3 PT ││ FT ✓ ││ FT ✗ │   │ ↩  Undo           │ │
 │ ├──────┤├──────┤├──────┤├──────┤   │    +2 PT          │ │
 │ │ FG ✓ ││ FG ✗ ││ 3P ✗ ││ ORB  │   │    Marcus Reed    │ │
 │ ├──────┤├──────┤├──────┤├──────┤   └───────────────────┘ │
 │ │ DRB  ││ AST  ││ STL  ││ BLK  │                         │
 │ └──────┘└──────┘└──────┘└──────┘                         │
 ╰──────────────────────────────────────────────────────────╯
```

### Unsaved Stats sheet — mobile, failure path only

```
┌────────────────────────── 390 ──────────────────────────┐
│  ⚠  2 stats not saved · Tap to fix            7:41 PM   │
├─────────────────────────────────────────────────────────┤
│ ╭─────────────────────────────────────────────────────╮ │
│ │ Unsaved stats                                    ✕  │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ These are on this phone but not on the server.      │ │
│ │                                                     │ │
│ │  Marcus Reed · +2 PT              7:38 PM           │ │
│ │  Couldn't reach the server.                         │ │
│ │  [ Retry ]                       [ Discard ]        │ │
│ │ ─────────────────────────────────────────────────── │ │
│ │  Jordan Ortiz · AST               7:39 PM           │ │
│ │  Couldn't reach the server.                         │ │
│ │  [ Retry ]                       [ Discard ]        │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │  [        Retry all         ]  [ Keep tracking ]    │ │
│ ╰─────────────────────────────────────────────────────╯ │
└─────────────────────────────────────────────────────────┘
```

---

## 4. The sync strip — the whole design in one component

This is the honest save state. Design rules it must satisfy:

- **Readable at arm's length in a loud gym.** Glyph + one word carries the meaning; the count is secondary. 15px minimum text, semibold, `tabular-nums` on the count.
- **Never colour alone.** Every state pairs a distinct glyph with distinct words, so it survives colour blindness, sunlight, and a cracked screen.
- **Quiet when things are fine, loud when they are not.** Saved is a thin low-emphasis bar. Failed is a full red bar. The coach's eye should only be pulled when something is wrong.
- **Never moves.** Same height (48px) in every state, so the page below never reflows and the coach never mis-taps because a bar grew. Fixed, so a scrolled page still shows it.
- **Zero taps to read.** It is only tappable in the two states where there is something to do.

| State | Glyph | Bar background | Text colour | Copy | Tappable |
|---|---|---|---|---|---|
| **Saved** (rest) | check | `bg-primary` `border-b border-secondary/20` | `#6EE7B7` glyph, `#F8FAFC`/70 text | `Saved` + right-aligned `7:41 PM` | No |
| **Pending** | spinner | `bg-primary` `border-b border-amber-400/40` | `#FBBF24` | `Saving 3…` | No |
| **Offline** | cloud-slash | `bg-amber-950/60` `border-b border-amber-400/50` | `#FBBF24` | `Offline · 12 saved on this phone` | Yes → Unsaved Stats sheet |
| **Failed** | warning triangle | `bg-red-950/70` `border-b border-red-400/60` | `#FCA5A5` | `2 stats not saved · Tap to fix` | Yes → Unsaved Stats sheet |
| **Recovering** | check | `bg-secondary/20` flash → settles to Saved over 900ms | `#6EE7B7` | `All 12 saved` | No |

Precedence when more than one condition is true: **Failed > Offline > Pending > Saved.** A single failed item outranks nine happily-pending ones, because failure is the only state that needs the coach.

**Rest-state honesty.** "Saved" is shown with the wall-clock time of the last successful write (`7:41 PM`, client clock — see §11). A bare green tick with no timestamp is the kind of reassurance that lies after the network dies; a timestamp lets a suspicious coach verify at a glance that it is current.

**Debounce.** Pending must not flicker. Do not show `Saving…` until a write has been in flight for **400ms**; below that the coach sees `Saved` continuously, which is the truth from their point of view. Once shown, hold `Saving…` for a minimum of **600ms** so it cannot strobe on a burst of taps.

---

## 5. Every state

### 5.1 Empty — no players on the roster

Live Track with zero eligible players. Today it renders an empty grid.

```
┌─────────────────────────────────────────────────────────┐
│  ✓  Saved                                     7:41 PM   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              No players on this roster yet              │
│      Add players to your team and they'll show up       │
│                  here ready to track.                   │
│                                                         │
│                 [  Go to roster  ]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The sync strip still renders in the `Saved` rest state. It is a property of the page, not of the grid.

**Sub-case: every player is marked DNP.** Grid is empty but the DNP row is populated. Copy: `Everyone is marked DNP. Tap a name below to bring them in.`

### 5.2 Loading — first fetch

Unchanged from today: centred `<Spinner size="lg" />`. The sync strip does **not** render during the initial load — there is nothing to save yet, and an empty `Saved` claim before data exists is a lie. It mounts with the first render of game data.

**Cold load while offline** (page HTML cached, API response cached): the game renders from the cached `GET /api/games/:gameID` response and the strip mounts directly into the **Offline** state with `Offline · showing last saved game`.

### 5.3 Populated — typical (8 players)

The grid as it stands. The strip sits at `Saved`. No per-tile decoration on any tile. This is the state the coach spends 95% of the game in and it should look exactly as calm as it does today.

### 5.4 Populated — crowded worst case (15 players, long names, a burst of taps)

This is the case to build against.

- 15 tiles, `grid-cols-2` on mobile → 8 rows, ~5.5 screens of scroll. The strip is `fixed`, so it stays legible through all of it.
- **Long names truncate, jersey numbers never do.** `#23 Alexander Nakamura-Whitfield` renders as `#23 Alexander Nakamu…`. The number is the identifier a coach actually navigates by; it gets `flex-shrink-0` and the name gets `truncate min-w-0`. The panel header shows the full untruncated name (it has the width).
- **Burst of six taps in two seconds across three players.** Every tap increments locally on its own frame. The strip reads `Saving 6…`, then counts down as writes land, then settles to `Saved`. Pending dots appear on the three affected tiles only.
- **Two taps on the same player 300ms apart.** Both apply. The second is computed from the value the first already produced locally — not from the server's stale copy. This is the lost-write fix and it is a *behaviour requirement*, not an implementation note: **N taps must always produce N increments.**

### 5.5 Pending

- Sync strip: `Saving 3…` (amber).
- Affected player tiles: a **10px amber dot** (`#FBBF24`) at the tile's top-right, 8px inset. Present, not animated — a pulsing dot on four tiles at once is visual noise on a sideline.
- In Box Score mode, the affected **row** gets a 3px amber left border instead of a dot.
- **Nothing is disabled.** The coach can keep tapping the same player, other players, or switch modes while writes are in flight. Blocking input here would reintroduce exactly the stall this card exists to remove.

### 5.6 Offline

Detected by `navigator.onLine` plus a failed write that looks like a network error.

- Sync strip: `Offline · 12 saved on this phone` (amber, tappable).
- Player tiles: **no dots.** When everything is queued, per-item markers are noise. The strip carries it.
- The panel, the buttons, undo, and DNP all keep working. Nothing goes read-only.
- Tapping the strip opens the Unsaved Stats sheet in its offline variant: the list is present but the per-row **Retry** buttons are replaced by a single line — `These will send automatically when you're back online.` — and the footer shows only `Keep tracking`. Do not offer a Retry button that is guaranteed to fail.

**On reconnect:** the strip goes to `Saving 12…`, then to the **Recovering** state — `All 12 saved` on a mint-tinted bar with a 900ms settle back to `Saved`. This is the only celebratory moment in the design and it earns it: it is the moment the coach finds out the last five minutes of the game were not lost.

### 5.7 Error — the write ultimately fails

After the queue has exhausted its retries for an item (developer's call on count and backoff; behaviour requirement: **at least ~30 seconds of retrying before an item is declared failed**, so a five-second wifi dropout never shows the coach a red bar).

- Sync strip: `2 stats not saved · Tap to fix` (red, tappable).
- Affected tiles: a **10px red ring** (`#FCA5A5`, 2px, unfilled) replaces the amber dot. Ring vs. dot is a shape difference, not just a colour difference.
- **The local value is never rolled back.** The coach saw the number go up; silently taking it back down is a second, worse version of the bug this card is fixing. The number stays, and the strip stays red until the coach resolves it.
- Tapping the strip opens the **Unsaved Stats sheet** (§3), which names each failed action in the coach's language (`Marcus Reed · +2 PT · 7:38 PM`), not in the API's (`PUT /stats/... 500`).
- Per-row **Retry** re-queues that one item. **Discard** removes it from the queue *and reverses its local effect* — this is the only path that ever takes a number back down, and the coach performs it deliberately.
- **Retry all** re-queues everything. It shows `isLoading` on the Button while the queue drains, then the sheet auto-closes if every item succeeds. If some still fail, the sheet stays open with the survivors and shows `Some stats still couldn't be saved. Try again, or discard them.`

**Discard is destructive → it confirms.** An inline confirm inside the row (not a nested modal): the row swaps to `Discard this stat? It won't be saved anywhere.` with `[ Discard ]` (danger) and `[ Cancel ]`. **Retry all** and per-row **Retry** are non-destructive and never confirm.

**Leaving with unsaved work.** If pending or failed count > 0 and the coach hits Back, closes the tab, or navigates away:
- Browser-level `beforeunload` for tab close / refresh.
- In-app Modal for in-app navigation: title `Stats not saved yet`, body `2 stats haven't reached the server. If you leave now they'll stay on this phone — they'll send next time you open this game on it.`, buttons `[ Stay here ]` (primary) / `[ Leave anyway ]` (secondary).

Do not block navigation outright. The coach may be leaving for a reason.

### 5.8 Success / confirmation

There is no toast on a successful stat tap. A toast per stat event would be 60 toasts a game, each of them covering the buttons the coach is trying to hit. Success is confirmed by three things that cost zero attention:

1. **The number moves on the same frame as the tap.** This is the primary confirmation.
2. **A 10ms haptic** (`navigator.vibrate(10)`) on stat record. This is the one that works in a loud gym without looking. Fires on stat record and on undo only — never on scroll, tile selection, or panel open.
3. **The value flashes.** The changed stat figure in both the tile and the panel header scales `1 → 1.12 → 1` over 180ms and briefly takes `#6EE7B7`. `transform` and `color` only — no layout property, no reflow. Respects `prefers-reduced-motion`: under reduced motion the scale is dropped and only the 180ms colour flash runs.

The only *transient* success message in the whole design is the **Recovering** strip state (§5.6), because coming back from offline is the one success worth reporting.

### 5.9 Interrupted — the phone slept mid-game

The queue survives a reload (persisted locally — mechanism is the developer's call). On reopening the game:

- If the queue is empty → normal `Saved` rest state.
- If it holds items → the strip mounts at `Saving N…` and drains, or at `Offline · N saved on this phone` if still offline.
- Nothing is lost and the coach is told nothing alarming if nothing is wrong.

> **Depends on SM-3.** A fresh load currently leaves `isCoach` false, which hides Live Track and every editable cell. Until SM-3 lands, this recovery path renders read-only and the coach cannot resume. SM-3 should land first or alongside.

---

## 6. Interaction detail

### Tap targets

| Element | Size | Notes |
|---|---|---|
| Sync strip (tappable states) | full width × 48px | Exceeds 44px. `touch-action: manipulation`. |
| Undo bar | full panel width × 56px | Deliberately the largest single control in the panel. |
| Stat buttons | unchanged (≥44px tall at 390px in the current 4-col grid) | Verify at 360px; if the grid drops any button under 44px, raise `py-3` to `py-3.5`. |
| Player tile | unchanged, ~76px tall | |
| Sheet row `Retry` / `Discard` | 44×44 minimum, ≥12px apart | Discard must not sit within a thumb-width of Retry. |
| Sheet `Retry all` / `Keep tracking` | 48px tall | |
| Pending dot / failed ring | 10px visual, **not interactive** | Purely a marker. The strip is the control. |

### Disabled states

- **Undo bar** is the only thing that ever disables. It is disabled when there is no undoable action and when the last action is older than 30 seconds (§7). Disabled = `opacity-40`, `cursor-not-allowed`, `disabled` attribute, and the label collapses to `Undo` with no subject. It stays in the layout at full height so the button below the coach's thumb never moves.
- **Stat buttons never disable**, including while writes are pending, while offline, and while items are failed. Disabling the core loop during a network problem is the failure mode this card exists to eliminate.
- **Retry / Retry all** show `isLoading` while draining rather than disappearing.

### Optimistic vs. blocking

| Action | Behaviour |
|---|---|
| Live stat tap | **Optimistic.** Local first, always. Never awaits the network. |
| Undo | **Optimistic.** Same path in reverse. |
| Box score cell edit | **Optimistic**, same queue, same strip. Consistency matters more than the marginal safety of blocking one surface. |
| Discard a failed item | **Blocking** on local state only (no network); applies immediately after confirm. |
| Toggle DNP | Out of scope — SM-2 owns it. |
| Set opponent score | Unchanged. |

### Focus and keyboard order

Live panel is a modal dialog. On open, focus moves to the panel container (`tabIndex={-1}`), not to `+2 PT` — landing focus on a stat-recording button invites a stray Enter.

Tab order inside the panel: **Close (✕) → +2 PT → +3 PT → FT ✓ → FT ✗ → FG ✓ → FG ✗ → 3P ✗ → ORB → DRB → AST → STL → BLK → TOV → Foul → Undo.** Undo last, because on a keyboard it is a considered action, not a reflex. Focus is trapped in the panel. `Escape` closes it and returns focus to the player tile that opened it.

Page order outside the panel: **skip past nav → Back → Set opp. score → Box Score → Live Track → [sync strip, only when tappable] → player tiles in visual order → DNP chips.** The sync strip is `fixed`, so verify it does not obscure a focused control — at 48px it sits above the header, and the page needs `padding-top: 48px` (`pt-12`) so nothing scrolls under it.

The Unsaved Stats sheet is a `Modal`: focus moves to its heading on open, is trapped, and returns to the sync strip on close.

---

## 7. Undo

**Scope: exactly one level — the last stat action.** Not a history stack. At arm's length in a gym, a multi-level undo is a control the coach cannot reason about at speed and one wrong tap away from mangling a good line. Anything older than the last action gets fixed in Box Score, which is the right tool for considered repair.

**Where it lives.** A full-width bar at the foot of the live panel's button cluster — inside the surface the coach's thumb is already in. **Zero taps to reach, one tap to use.** It is not a toast: a toast would auto-dismiss on the exact timescale where the coach is looking at the court rather than the phone, and would cover the buttons on its way out.

**What it says.** The bar always names what it will undo, so the coach never has to remember:

- Enabled: `↩  Undo  +2 PT · Marcus Reed`
- Enabled, cross-player: the subject is whoever the action belonged to, even if a different player's panel is now open — `↩  Undo  STL · Jordan Ortiz`. Undo reverses the last action *in the game*, not the last action *in this panel*. Anything else surprises the coach when they have already moved on to the next player.
- Disabled: `↩  Undo` (dimmed)

**How long it stays.** Enabled for **30 seconds** after the last recorded action, then it disables. Thirty seconds is roughly a possession plus the walk back — long enough to catch a mis-tap you noticed on the next trip down the floor, short enough that it cannot silently reverse something from two minutes ago. Recording any new action resets the window and repoints the target.

**What it does.**
- Applies the exact inverse delta locally, immediately, with haptic and value flash (in reverse: flash uses `#FBBF24`, not mint — this is a correction, not a score).
- If the original write has **not yet been sent**, it is cancelled in the queue — no network traffic at all.
- If it **has** been sent, a compensating write is queued.
- If the original write is in the **failed** list, undo removes it from that list and reverses it. The strip's failed count drops.

**No confirmation.** Undo *is* the confirmation-free escape hatch; guarding it with a dialog defeats it. It is also self-inverting: undo an undo by re-tapping the stat.

**Announcement:** `Undid 2 points for Marcus Reed. Now 18 points.`

---

## 8. Components

### Reused as-is

| Component | Where |
|---|---|
| `Modal` | Unsaved Stats sheet, the leave-with-unsaved-work confirm. |
| `Button` | `Retry all` (primary), `Keep tracking` (secondary), `Retry` (secondary), `Discard` (danger), `Stay here` / `Leave anyway`. `isLoading` on `Retry all`. |
| `Spinner` | `size="sm"` inside the pending strip glyph; `size="lg"` unchanged on initial load. |
| `Badge` | Not used. The strip needs a 48px bar, not a pill; forcing `Badge` here would produce a sub-44px target and the wrong emphasis. |

### New — `SyncStatusBar`

The only genuinely new primitive. It is generic enough to serve any future write-heavy surface, so it belongs in `components/ui/`, not inside `GameDetailPage`.

```ts
type SyncState = 'saved' | 'pending' | 'offline' | 'failed'

interface SyncStatusBarProps {
  state: SyncState
  /** Number of queued-or-failed writes. Rendered only when > 0 and state != 'saved'. */
  count?: number
  /** Wall-clock time of the last successful write. Rendered in the 'saved' state. */
  lastSavedAt?: Date | null
  /** Present ⇒ the bar is a button. Supply only for 'offline' and 'failed'. */
  onClick?: () => void
  /** Renders as an inline pill instead of a full-bleed fixed bar. Desktop ≥1024px. */
  inline?: boolean
  className?: string
}
```

Behaviour owned by the component: the 400ms pending debounce, the 600ms minimum hold, the 900ms Recovering flash on `pending → saved` when `count` was > 0, and the `role="alert"` announcement on entering `failed` or `offline`.

### New — `UndoBar`

Small enough to live in `GameDetailPage.tsx` alongside `LivePanel`. Specified here so the developer does not have to invent the API.

```ts
interface UndoBarProps {
  /** null ⇒ disabled. */
  target: { label: string; playerName: string } | null   // e.g. { label: '+2 PT', playerName: 'Marcus Reed' }
  onUndo: () => void
  className?: string
}
```

The 30-second expiry lives in the caller (the store knows when the last action happened); `UndoBar` disables purely on `target === null`.

### Extended — player tile / box score row

No new component. Add a `syncState?: 'pending' | 'failed'` marker to the existing tile markup: amber dot, red ring, or nothing.

---

## 9. Copy

Every string, final.

**Sync strip**
- Saved: `Saved` · right-aligned `7:41 PM`
- Pending: `Saving 3…` (singular: `Saving 1…`)
- Offline: `Offline · 12 saved on this phone` (singular: `Offline · 1 saved on this phone`)
- Failed: `2 stats not saved · Tap to fix` (singular: `1 stat not saved · Tap to fix`)
- Recovering: `All 12 saved` (singular: `Saved`)
- Offline cold load: `Offline · showing last saved game`

**Undo bar**
- Enabled: `Undo  +2 PT · Marcus Reed`
- Disabled: `Undo`

**Unsaved Stats sheet**
- Title: `Unsaved stats`
- Intro (failed): `These are on this phone but not on the server.`
- Intro (offline): `These are saved on this phone. They'll send automatically when you're back online.`
- Row: `Marcus Reed · +2 PT` · `7:38 PM`
- Row reason, network: `Couldn't reach the server.`
- Row reason, rejected by server: `The server turned this one down.`
- Row reason, not allowed: `You don't have permission to edit this game.`
- Row buttons: `Retry` · `Discard`
- Discard confirm (inline, replaces the row): `Discard this stat? It won't be saved anywhere.` · `Discard` · `Cancel`
- Footer: `Retry all` · `Keep tracking`
- Partial failure after Retry all: `Some stats still couldn't be saved. Try again, or discard them.`
- All resolved (sheet closes, strip goes Recovering): `All 12 saved`

**Leave-with-unsaved-work modal**
- Title: `Stats not saved yet`
- Body: `2 stats haven't reached the server. If you leave now they'll stay on this phone — they'll send next time you open this game on it.`
- Buttons: `Stay here` · `Leave anyway`
- `beforeunload`: browser-supplied text (not authorable).

**Empty states**
- No roster: `No players on this roster yet` / `Add players to your team and they'll show up here ready to track.` / `Go to roster`
- All DNP: `Everyone is marked DNP. Tap a name below to bring them in.`

**Screen reader announcements** (see §10)
- Stat: `2 points added for Marcus Reed. 20 points.`
- Non-scoring stat: `Assist added for Jordan Ortiz. 4 assists.`
- Undo: `Undid 2 points for Marcus Reed. Now 18 points.`
- Failed (alert): `2 stats could not be saved. Open the unsaved stats list to retry.`
- Offline (alert): `You're offline. Stats are being saved on this phone.`
- Back online: `Back online. All 12 stats saved.`

**Accessible names for non-text controls**
- Strip, saved: `aria-label="All stats saved. Last saved 7:41 PM."`
- Strip, pending: `aria-label="Saving 3 stats."`
- Strip, offline: `aria-label="Offline. 12 stats saved on this phone. Open unsaved stats."`
- Strip, failed: `aria-label="2 stats not saved. Open unsaved stats to retry."`
- Pending dot: `aria-label="Stats saving"` on the tile, appended to the tile's existing name.
- Failed ring: `aria-label="Stats not saved"`.

Words this design does not use: *sync*, *queue*, *offline-first*, *conflict*, *error 500*, *optimistic*, *retry limit exceeded*. A coach is not debugging; they are coaching.

---

## 10. Accessibility

### Contrast — measured against the actual dark palette

| Foreground | Background | Ratio | Passes |
|---|---|---|---|
| `#6EE7B7` mint | `#0F172A` primary | **11.7:1** | AA + AAA |
| `#FBBF24` amber-400 | `#0F172A` primary | **10.7:1** | AA + AAA |
| `#FBBF24` amber-400 | `amber-950/60` over `#020617` | **≥8:1** | AA + AAA |
| `#FCA5A5` red-300 | `red-950/70` over `#020617` | **≥7.5:1** | AA + AAA |
| `#F8FAFC`/70 | `#0F172A` primary | **~11:1** | AA + AAA |

The strip's own border against the page (`border-amber-400/50`, `border-red-400/60`) clears the 3:1 non-text threshold, so the bar reads as a distinct surface and not as floating text.

> **Palette note.** Amber `#FBBF24` and red `#FCA5A5` are outside the five-colour design system in `CLAUDE.md`. This is deliberate and, I think, unavoidable: the system has no warning or danger hue, and this card is entirely about telling the truth when something is wrong. Emerald and mint are already the "everything is fine" colours here, so reusing them for failure would be actively misleading. `#FCA5A5` is not new to the codebase — `Badge` and `Button` already use `red-300` / `red-700` for the danger variant, so the failed state is consistent with the existing danger language. Amber is the one genuine addition; it maps to the existing `Badge` `yellow` variant's family. Recommend adding `--color-warning: #FBBF24` and `--color-danger: #FCA5A5` as semantic tokens rather than scattering Tailwind palette classes.

**Colour is never the only channel.** Saved/Pending/Offline/Failed each carry a unique glyph *and* a unique word. The tile markers pair colour with shape: filled dot = pending, unfilled ring = failed. A monochrome screenshot of any state is still unambiguous.

### Live regions — exactly one, no competing announcers

The pitfall here is a live region per player tile shouting bare numbers. The design uses **one** page-level announcer plus **one** transition-only alert.

1. **Action announcer** — a single visually-hidden `<div role="status" aria-live="polite" aria-atomic="true">` on `GameDetailPage`. Receives one complete contextual sentence per recorded action or undo (`2 points added for Marcus Reed. 20 points.`). Debounced 400ms; on a burst, only the latest sentence is announced so a screen reader is not backed up behind six queued utterances. Never a bare number.
2. **Failure alert** — a separate visually-hidden `role="alert"` that fires **once per state transition** into `failed`, into `offline`, and back to online. Never per item, never on `pending → saved`.
3. **The sync strip itself is not a live region** (`aria-live="off"`). Its text changes constantly and announcing every change would drown the announcer above. It is readable on demand via its `aria-label`, and it is in the tab order whenever it is actionable.
4. **Player tiles are not live regions.** Their numbers change silently; the announcer carries the news.

### Roles and semantics

- Sync strip: `<div role="status">` when static; `<button type="button">` with the `aria-label`s in §9 when tappable. Never a clickable `div`.
- Live panel: `role="dialog" aria-modal="true" aria-labelledby={playerNameId}`. Focus trapped; `Escape` closes; focus returns to the originating tile.
- Unsaved Stats sheet: existing `Modal`, plus `aria-labelledby` on its title. Each row is a `<li>` in a `<ul>`; row buttons have accessible names that include the subject (`aria-label="Retry saving 2 points for Marcus Reed"`), because a screen of nine identical `Retry` buttons is unusable otherwise.
- Undo bar: `<button>` with `aria-label="Undo 2 points for Marcus Reed"` — the visible label uses the compact `+2 PT` shorthand, the accessible name spells it out.
- Glyphs are inline SVG (matching the existing hand-rolled SVG usage in `Modal`), `aria-hidden="true"` since the adjacent word carries the meaning. **No emoji.** The check / spinner / cloud-slash / warning marks in the wireframes above are stand-ins for icons, not literal characters to ship.

### Motion

`prefers-reduced-motion: reduce` drops the value-flash scale, the Recovering bar flash, and the pending spinner rotation (the spinner becomes a static filled dot). Colour changes and text changes remain — they carry information and must not be suppressed. No animation is load-bearing: every state is fully legible from a static screenshot.

### Focus rings

Reuse the existing convention (`focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2` with `ring-offset-background`). Emerald `#10B981` against `#020617` clears 3:1 comfortably. The strip is `fixed` at the top of the viewport, so the page's `pt-12` offset guarantees it never covers a focused control below it.

---

## 11. Data the backend does not have

Read this before starting. Three of these change what the developer builds.

1. **There is no delta/increment endpoint.** `PUT /api/games/:gameID/stats/:memberID` takes an absolute stat line and last-write-wins. That is exactly what causes fault (2) on the card, and it becomes sharper once writes are queued: a queued absolute line computed at 7:38 will clobber a newer one if it lands late. The behaviour this spec requires — *N taps produce N increments, in order, whatever the network does* — can be met client-side by collapsing the queue against the newest local line before each send, but a `PATCH` that takes deltas (`{ pts: +2, fgm: +1, fga: +1 }`) would make it correct by construction. **Developer's call, but the client-side route must be deliberate, not incidental.**

2. **There is no version, ETag, or `updated_at` on a stats row**, so the client cannot detect that the server's copy moved underneath it. Single-coach-per-game makes this survivable today. It stops being survivable the moment two people track the same game from two phones, and it is worth a line in the response now rather than a migration later.

3. **There is no server timestamp on a stat write**, so `Saved 7:41 PM` is the *client's* clock reading the moment the response arrived. Correct enough for "is this current?", which is all the strip claims. Do not let this copy grow into anything that implies server-side authority.

4. **`/api/games/*` is absent from workbox `runtimeCaching`** (`frontend/vite.config.ts`), so the game page will not open offline at all — §5.2's offline cold load is impossible until `GET /api/games/:gameID` is cached. Cache **GET only**; mutations must never be served from cache.

5. **`GET /api/games/:gameID` performs writes** — `GetGameDetail` re-seeds `game_players` on every read (already logged in the KANBAN decision log). Worth knowing before caching that route, and worth folding into this card since it is the route being touched.

Nothing else in this spec needs an endpoint that does not exist.

---

## 12. Responsive behaviour

| Breakpoint | Sync strip | Undo bar | Player grid | Why |
|---|---|---|---|---|
| **<640px** (phone, the design target) | Full-bleed `fixed` bar, top of viewport, 48px, above the panel scrim. Page gets `pt-12`. | Full width of the panel gutter, 56px, below the stat grid. | `grid-cols-2` (unchanged) | Thumb reach and glanceability. The strip must survive a scrolled page and an open full-screen panel — which is precisely when the coach is recording. |
| **640–1023px** (large phone landscape, small tablet) | Same fixed bar. | Same. | `sm:grid-cols-3` (unchanged) | No reason to change; the strip is still the only thing carrying trust and the panel is still a bottom sheet. |
| **≥1024px** (desktop) | `inline` pill in the header row beside the score. Not fixed, not full-bleed. Page loses its `pt-12`. | Moves beside the stat grid rather than below it. | `md:grid-cols-4` (unchanged) | On desktop the header is always on screen and the panel is a centred dialog rather than a full-screen sheet, so a fixed full-bleed bar would be an unnecessary permanent band across a wide viewport. The strip returns to being a status indicator rather than a piece of furniture. |

**Landscape phone** (a real sideline posture): viewport height can be ~390px. The strip's 48px is 12% of that, which is acceptable; the live panel's sheet must cap at `max-h-[85dvh]` and scroll internally so the Undo bar is never pushed off-screen. Use `dvh`, not `vh`, so the mobile browser chrome does not eat it.

**Safe areas.** The strip respects `env(safe-area-inset-top)`; the panel's bottom padding already accounts for the gesture bar and must continue to, with the Undo bar sitting above that padding, not inside it.

---

## 13. Relationship to SM-5 — read before building

SM-5 (P1, Backlog) will replace the `fixed inset-0` panel so it stops covering the roster and stops costing 3 taps per player switch. Two of this spec's decisions touch that work.

**No conflict — deliberate:**
- The **sync strip is anchored to the page, not to the panel.** It renders in Box Score mode, in Live mode, and above the panel scrim. Whatever SM-5 does to the panel, the strip is untouched. This is the main reason it is `fixed` rather than placed inside the panel header.
- **Pending/failed markers live on the player tiles**, which SM-5 keeps in some form. They survive the panel being redesigned into a dock, a split view, or an inline expander.
- The **announcer and alert regions are page-level.**

**One constraint SM-5 must honour:**
- The **Undo bar must stay attached to whatever the stat-button cluster becomes**, and it must remain reachable in zero taps from wherever the coach's thumb already is. If SM-5 shrinks the panel into a bottom dock, Undo goes in the dock. If SM-5 makes stat buttons appear inline under a selected tile, Undo goes at the foot of that inline cluster. What it must not become is a control the coach has to open something to reach — that turns a 1-tap correction into 3 and reintroduces the problem in a different place.
- A secondary consequence: SM-5's "keep the roster tappable" goal means the pending dot on a tile could sit under a coach's thumb during a fast switch. Keep the dot non-interactive and inset 8px from the tile corner so it never intercepts a tile tap.

**Not a conflict, but worth flagging:** SM-5 also wants `mode` persisted so the phone sleeping mid-game does not drop the coach out of Live Track. §5.9 of this spec assumes the coach lands back where they were. If SM-1 ships first, the recovery experience is *correct* (nothing lost, strip drains) but still costs one tap to re-enter Live Track.

---

## 14. Explicitly out of scope

Do not build these as part of SM-1.

- **Redesigning the live panel layout or the player-switch flow.** SM-5 owns it. This card adds exactly one row to the panel and changes nothing else about it.
- **DNP behaviour.** SM-2 owns the stat-wiping bug, the DNP button's size, and its placement. Do not touch `toggleDNP`, and do not put DNP through the new queue in this card.
- **Restoring coach access on reload.** SM-3 owns it. Flagged as a dependency in §5.9, not solved here.
- **Team score persistence and date formatting.** SM-4. The header still shows a computed `teamScore` and a raw date — leave both alone so the diffs do not collide.
- **Multi-level undo / a full action history.** §7 explains why. One level, 30 seconds.
- **An editable action log or "recent events" feed.** Attractive, and a much bigger surface than this card. If a coach needs to repair something older than the undo window, Box Score is the tool.
- **Multi-device conflict resolution.** Flagged in §11 point 2. Single coach per game is the assumption; do not build merge UI.
- **Offline creation of new games, editing rosters offline, or offline playbook editing.** This card makes the *live stat path* and the game detail *read* work offline. Nothing else.
- **A settings toggle for haptics.** The OS-level setting is the right control. Do not add an app preference.
- **Toasts for successful saves.** Deliberately rejected in §5.8.
- **Changing the visual design of the stat buttons, the player tiles, or the mode toggle.** Only the two states in §5.5 and §5.7 add anything to them.
