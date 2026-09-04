import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../../stores/gameStore'
import { useAuthStore } from '../../stores/authStore'
import { useTeamStore } from '../../stores/teamStore'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { formatGameDate } from '../../lib/gameFormat'
import type { GamePlayer, GameStats } from '../../types'

// ── Computed helpers ──────────────────────────────────────────────────────────

function pct(made: number, att: number): string {
  if (att === 0) return '—'
  return ((made / att) * 100).toFixed(1) + '%'
}

function emptyStats(): GameStats {
  return { mins: 0, pts: 0, fgm: 0, fga: 0, three_pm: 0, three_pa: 0, ftm: 0, fta: 0, orb: 0, drb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, plus_minus: 0 }
}

// ── Box Score Table ───────────────────────────────────────────────────────────

// Columns with computed stats interleaved where they belong.
type ColDef =
  | { kind: 'raw'; key: keyof GameStats; label: string }
  | { kind: 'computed'; label: string; render: (s: GameStats) => string | number }

const STAT_COLS: ColDef[] = [
  { kind: 'raw', key: 'mins', label: 'MIN' },
  { kind: 'raw', key: 'pts', label: 'PTS' },
  { kind: 'raw', key: 'fgm', label: 'FGM' },
  { kind: 'raw', key: 'fga', label: 'FGA' },
  { kind: 'computed', label: 'FG%', render: (s) => pct(s.fgm, s.fga) },
  { kind: 'raw', key: 'three_pm', label: '3PM' },
  { kind: 'raw', key: 'three_pa', label: '3PA' },
  { kind: 'computed', label: '3P%', render: (s) => pct(s.three_pm, s.three_pa) },
  { kind: 'raw', key: 'ftm', label: 'FTM' },
  { kind: 'raw', key: 'fta', label: 'FTA' },
  { kind: 'computed', label: 'FT%', render: (s) => pct(s.ftm, s.fta) },
  { kind: 'raw', key: 'orb', label: 'ORB' },
  { kind: 'raw', key: 'drb', label: 'DRB' },
  { kind: 'computed', label: 'REB', render: (s) => s.orb + s.drb },
  { kind: 'raw', key: 'ast', label: 'AST' },
  { kind: 'raw', key: 'stl', label: 'STL' },
  { kind: 'raw', key: 'blk', label: 'BLK' },
  { kind: 'raw', key: 'tov', label: 'TOV' },
  { kind: 'raw', key: 'pf', label: 'PF' },
  { kind: 'raw', key: 'plus_minus', label: '+/-' },
]

function StatCell({
  value,
  onChange,
  canEdit,
}: {
  value: number
  onChange: (v: number) => void
  canEdit: boolean
}) {
  const [local, setLocal] = useState(String(value))

  useEffect(() => {
    setLocal(String(value))
  }, [value])

  if (!canEdit) {
    return <td className="px-0.5 py-1 text-center text-xs text-foreground/70 min-w-[38px]">{value}</td>
  }

  return (
    <td className="px-0.5 py-1 min-w-[38px]">
      <input
        type="number"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = parseInt(local, 10)
          if (!isNaN(n) && n !== value) onChange(n)
          else setLocal(String(value))
        }}
        className="w-9 rounded border border-secondary/20 bg-background px-0.5 py-0.5 text-center text-xs text-foreground focus:border-secondary focus:outline-none"
      />
    </td>
  )
}

function BoxScoreTable({
  players,
  canEdit,
  onSaveStats,
  onToggleDNP,
}: {
  players: GamePlayer[]
  canEdit: boolean
  onSaveStats: (memberID: string, stats: GameStats) => Promise<void>
  onToggleDNP: (memberID: string) => Promise<void>
}) {
  function handleStatChange(player: GamePlayer, key: keyof GameStats, val: number) {
    const current = player.stats ?? emptyStats()
    void onSaveStats(player.member_id, { ...current, [key]: val })
  }

  const active = players.filter((p) => !p.is_dnp)
  const dnp = players.filter((p) => p.is_dnp)

  return (
    <div className="overflow-x-auto rounded-lg border border-secondary/20">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-secondary/20 bg-primary">
            <th className="sticky left-0 z-10 bg-primary px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground/50 min-w-[120px]">Player</th>
            {STAT_COLS.map((c, i) => (
              <th key={i} className={`px-0.5 py-2 text-center text-xs font-semibold uppercase tracking-wide min-w-[38px] ${c.kind === 'computed' ? 'text-foreground/30' : 'text-foreground/50'}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {active.map((player) => {
            const s = player.stats ?? emptyStats()
            return (
              <tr key={player.member_id} className="border-b border-secondary/10 hover:bg-white/5">
                <td className="sticky left-0 z-10 bg-background px-3 py-2 min-w-[120px]">
                  <div className="flex items-center gap-1.5">
                    {player.jersey_number !== null && (
                      <span className="text-xs text-foreground/40">#{player.jersey_number}</span>
                    )}
                    <span className="text-xs font-medium text-foreground">{player.name}</span>
                    {canEdit && (
                      <button
                        onClick={() => void onToggleDNP(player.member_id)}
                        className="text-xs text-foreground/30 hover:text-foreground/60"
                        title="Mark as DNP"
                      >DNP</button>
                    )}
                  </div>
                </td>
                {STAT_COLS.map((c, i) =>
                  c.kind === 'raw' ? (
                    <StatCell
                      key={i}
                      value={s[c.key]}
                      canEdit={canEdit}
                      onChange={(v) => handleStatChange(player, c.key, v)}
                    />
                  ) : (
                    <td key={i} className="px-0.5 py-1 text-center text-xs text-foreground/40 min-w-[38px]">{c.render(s)}</td>
                  )
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {dnp.length > 0 && (
        <div className="border-t border-secondary/10 px-3 py-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/30">DNP</p>
          <div className="flex flex-wrap gap-3">
            {dnp.map((p) => (
              <div key={p.member_id} className="flex items-center gap-1 text-sm text-foreground/40">
                {p.jersey_number !== null && <span className="text-xs">#{p.jersey_number}</span>}
                <span>{p.name}</span>
                {canEdit && (
                  <button
                    onClick={() => void onToggleDNP(p.member_id)}
                    className="ml-1 text-xs text-secondary hover:underline"
                  >
                    Mark active
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Opponent score entry ──────────────────────────────────────────────────────

// A keypad rather than a text field: this is entered courtside, one-handed,
// and it replaces a window.prompt that could not be styled, could not be
// dismissed by tapping away, and offered a full keyboard for a number.
function OpponentScoreModal({
  initial,
  onClose,
  onSave,
}: {
  initial: number | null
  onClose: () => void
  onSave: (score: number) => Promise<void>
}) {
  const [value, setValue] = useState(initial === null ? '' : String(initial))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const push = (d: string) => setValue((v) => (v === '0' ? d : (v + d).slice(0, 3)))

  async function handleSave() {
    const n = parseInt(value, 10)
    if (isNaN(n) || n < 0) {
      setError('Enter a score of 0 or more.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave(n)
      onClose()
    } catch {
      setError('Could not save the score. Check your connection and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Opponent score">
      <div className="flex flex-col gap-3">
        <p className="text-center text-4xl font-bold tabular-nums text-foreground">{value === '' ? '—' : value}</p>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => push(d)}
              className="rounded-lg border border-secondary/20 py-3 text-lg font-semibold text-foreground hover:bg-white/5"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setValue('')}
            className="rounded-lg border border-secondary/20 py-3 text-sm text-foreground/50 hover:bg-white/5"
          >
            Clear
          </button>
          <button
            onClick={() => push('0')}
            className="rounded-lg border border-secondary/20 py-3 text-lg font-semibold text-foreground hover:bg-white/5"
          >
            0
          </button>
          <button
            onClick={() => setValue((v) => v.slice(0, -1))}
            className="rounded-lg border border-secondary/20 py-3 text-sm text-foreground/50 hover:bg-white/5"
          >
            ⌫
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button onClick={() => void handleSave()} isLoading={isSaving} disabled={value === ''}>
          Save
        </Button>
      </div>
    </Modal>
  )
}

// ── Live Mode ─────────────────────────────────────────────────────────────────

type LivePanelStat =
  | { type: 'pts2' } | { type: 'pts3' } | { type: 'ftMade' } | { type: 'ftMiss' }
  | { type: 'fgMade' } | { type: 'fgMiss' } | { type: '3pMiss' }
  | { type: 'orbReb' } | { type: 'drbReb' }
  | { type: 'ast' } | { type: 'stl' } | { type: 'blk' } | { type: 'tov' } | { type: 'foul' }

function applyLiveStat(current: GameStats, action: LivePanelStat): GameStats {
  const s = { ...current }
  switch (action.type) {
    case 'pts2':  s.pts += 2; s.fgm += 1; s.fga += 1; break
    case 'pts3':  s.pts += 3; s.fgm += 1; s.fga += 1; s.three_pm += 1; s.three_pa += 1; break
    case 'ftMade': s.pts += 1; s.ftm += 1; s.fta += 1; break
    case 'ftMiss': s.fta += 1; break
    case 'fgMade': s.fgm += 1; s.fga += 1; break
    case 'fgMiss': s.fga += 1; break
    case '3pMiss': s.three_pa += 1; s.fga += 1; break
    case 'orbReb': s.orb += 1; break
    case 'drbReb': s.drb += 1; break
    case 'ast':  s.ast += 1; break
    case 'stl':  s.stl += 1; break
    case 'blk':  s.blk += 1; break
    case 'tov':  s.tov += 1; break
    case 'foul': s.pf += 1; break
  }
  return s
}

function LivePanel({
  player,
  onAction,
  onClose,
}: {
  player: GamePlayer
  onAction: (action: LivePanelStat) => void
  onClose: () => void
}) {
  const s = player.stats ?? emptyStats()
  const btnBase = 'rounded-lg py-3 text-sm font-semibold transition-colors active:scale-95'
  const scoring = 'bg-secondary/20 text-accent hover:bg-secondary/30'
  const other = 'bg-white/5 text-foreground/70 hover:bg-white/10'

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl border-t border-secondary/20 bg-primary p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-foreground">{player.name}</span>
            {player.jersey_number !== null && (
              <span className="ml-2 text-sm text-foreground/40">#{player.jersey_number}</span>
            )}
          </div>
          <span className="text-sm text-foreground/50">{s.pts} PTS · {s.orb + s.drb} REB · {s.ast} AST</span>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground">✕</button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button className={`${btnBase} ${scoring} col-span-1`} onClick={() => onAction({ type: 'pts2' })}>+2 PT</button>
          <button className={`${btnBase} ${scoring} col-span-1`} onClick={() => onAction({ type: 'pts3' })}>+3 PT</button>
          <button className={`${btnBase} ${scoring} col-span-1`} onClick={() => onAction({ type: 'ftMade' })}>FT ✓</button>
          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'ftMiss' })}>FT ✗</button>

          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'fgMade' })}>FG ✓</button>
          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'fgMiss' })}>FG ✗</button>
          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: '3pMiss' })}>3P ✗</button>
          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'orbReb' })}>ORB</button>

          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'drbReb' })}>DRB</button>

          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'ast' })}>AST</button>
          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'stl' })}>STL</button>
          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'blk' })}>BLK</button>
          <button className={`${btnBase} ${other} col-span-1`} onClick={() => onAction({ type: 'tov' })}>TOV</button>

          <button className={`${btnBase} ${other} col-span-2`} onClick={() => onAction({ type: 'foul' })}>Foul (+1 PF)</button>
        </div>
      </div>
    </div>
  )
}

function LiveMode({
  players,
  onAction,
  onToggleDNP,
}: {
  players: GamePlayer[]
  onAction: (memberID: string, action: LivePanelStat) => void
  onToggleDNP: (memberID: string) => Promise<void>
}) {
  const [activePlayerID, setActivePlayerID] = useState<string | null>(null)
  const active = players.filter((p) => !p.is_dnp)
  const dnp = players.filter((p) => p.is_dnp)
  // Derive from props so the panel always shows the latest stats from the store
  const activePlayer = activePlayerID ? (players.find((p) => p.member_id === activePlayerID) ?? null) : null

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {active.map((player) => {
          const s = player.stats ?? emptyStats()
          return (
            <button
              key={player.member_id}
              onClick={() => setActivePlayerID(player.member_id)}
              className="flex flex-col gap-1 rounded-xl border border-secondary/20 bg-primary p-4 text-left transition-colors hover:border-secondary/40"
            >
              <div className="flex items-center gap-2">
                {player.jersey_number !== null && (
                  <span className="text-xs text-foreground/40">#{player.jersey_number}</span>
                )}
                <span className="text-sm font-semibold text-foreground truncate">{player.name}</span>
              </div>
              <div className="flex gap-3 text-xs text-foreground/50">
                <span><span className="font-bold text-accent">{s.pts}</span> PTS</span>
                <span><span className="font-bold text-foreground/70">{s.orb + s.drb}</span> REB</span>
                <span><span className="font-bold text-foreground/70">{s.ast}</span> AST</span>
              </div>
            </button>
          )
        })}
      </div>

      {dnp.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/30">DNP</p>
          <div className="flex flex-wrap gap-2">
            {dnp.map((p) => (
              <button
                key={p.member_id}
                onClick={() => void onToggleDNP(p.member_id)}
                className="rounded-lg border border-secondary/10 bg-primary px-3 py-2 text-xs text-foreground/40 hover:border-secondary/30 hover:text-foreground/60"
              >
                {p.name} — tap to activate
              </button>
            ))}
          </div>
        </div>
      )}

      {activePlayer && (
        <LivePanel
          player={activePlayer}
          onAction={(action) => {
            onAction(activePlayer.member_id, action)
          }}
          onClose={() => setActivePlayerID(null)}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GameDetailPage() {
  const { gameID } = useParams<{ gameID: string }>()
  const navigate = useNavigate()
  const { currentGame, isLoading, fetchGameDetail, updateGame, upsertStats, toggleDNP } = useGameStore()
  const { currentTeam } = useTeamStore()
  const { user } = useAuthStore()
  const [mode, setMode] = useState<'boxscore' | 'live'>('boxscore')
  const [scoreModalOpen, setScoreModalOpen] = useState(false)

  useEffect(() => {
    if (gameID) void fetchGameDetail(gameID)
  }, [gameID, fetchGameDetail])

  const isCoach = !!(currentTeam && user && currentTeam.coach_id === user.id)

  const handleSaveStats = useCallback(async (memberID: string, stats: GameStats) => {
    if (!gameID) return
    await upsertStats(gameID, memberID, stats)
  }, [gameID, upsertStats])

  const handleToggleDNP = useCallback(async (memberID: string) => {
    if (!gameID) return
    await toggleDNP(gameID, memberID)
  }, [gameID, toggleDNP])

  const handleLiveAction = useCallback(async (memberID: string, action: LivePanelStat) => {
    if (!gameID || !currentGame) return
    const player = currentGame.players.find((p) => p.member_id === memberID)
    if (!player) return
    const updated = applyLiveStat(player.stats ?? emptyStats(), action)
    await upsertStats(gameID, memberID, updated)
  }, [gameID, currentGame, upsertStats])

  if (isLoading || !currentGame) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  }

  const { game, players } = currentGame
  const teamScore = players.filter((p) => !p.is_dnp).reduce((sum, p) => sum + (p.stats?.pts ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate(`/teams/${game.team_id}`)} className="text-sm text-foreground/40 hover:text-foreground">
            ← Back
          </button>
          <h1 className="mt-1 text-xl font-bold text-foreground">vs {game.opponent_name}</h1>
          <p className="text-sm text-foreground/50">{formatGameDate(game.game_date)}</p>
        </div>
        <div className="text-right">
          {/* Our score is the box score's own total, computed locally so it
              moves as stats are entered without waiting for a refetch. */}
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {teamScore} — {game.opponent_score ?? '?'}
          </p>
          {isCoach && (
            <div className="mt-1 flex justify-end gap-2">
              <button
                onClick={() => setScoreModalOpen(true)}
                className="text-xs text-foreground/40 hover:text-foreground"
              >
                {game.opponent_score === null ? 'Set opp. score' : 'Edit opp. score'}
              </button>
            </div>
          )}
        </div>
      </div>

      {scoreModalOpen && (
        <OpponentScoreModal
          initial={game.opponent_score}
          onClose={() => setScoreModalOpen(false)}
          onSave={(score) => updateGame(game.id, { opponent_score: score })}
        />
      )}

      {/* Mode toggle */}
      {isCoach && (
        <div className="flex gap-1 self-start rounded-lg border border-secondary/20 bg-primary p-1">
          {(['boxscore', 'live'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m ? 'bg-secondary text-background' : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              {m === 'boxscore' ? 'Box Score' : 'Live Track'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {mode === 'boxscore' ? (
        <BoxScoreTable
          players={players}
          canEdit={isCoach}
          onSaveStats={handleSaveStats}
          onToggleDNP={handleToggleDNP}
        />
      ) : (
        <LiveMode
          players={players}
          onAction={handleLiveAction}
          onToggleDNP={handleToggleDNP}
        />
      )}
    </div>
  )
}
