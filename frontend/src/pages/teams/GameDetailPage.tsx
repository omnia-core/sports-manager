import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../../stores/gameStore'
import { useAuthStore } from '../../stores/authStore'
import { useTeamStore } from '../../stores/teamStore'
import Spinner from '../../components/ui/Spinner'
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

const STAT_COLS: Array<{ key: keyof GameStats; label: string }> = [
  { key: 'mins', label: 'MINS' }, { key: 'pts', label: 'PTS' },
  { key: 'fgm', label: 'FGM' }, { key: 'fga', label: 'FGA' },
  { key: 'three_pm', label: '3PM' }, { key: 'three_pa', label: '3PA' },
  { key: 'ftm', label: 'FTM' }, { key: 'fta', label: 'FTA' },
  { key: 'orb', label: 'ORB' }, { key: 'drb', label: 'DRB' },
  { key: 'ast', label: 'AST' }, { key: 'stl', label: 'STL' },
  { key: 'blk', label: 'BLK' }, { key: 'tov', label: 'TOV' },
  { key: 'pf', label: 'PF' }, { key: 'plus_minus', label: '+/-' },
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
  onSaveStats: (userID: string, stats: GameStats) => Promise<void>
  onToggleDNP: (userID: string) => Promise<void>
}) {
  function handleStatChange(player: GamePlayer, key: keyof GameStats, val: number) {
    const current = player.stats ?? emptyStats()
    void onSaveStats(player.user_id, { ...current, [key]: val })
  }

  const active = players.filter((p) => !p.is_dnp)
  const dnp = players.filter((p) => p.is_dnp)

  return (
    <div className="overflow-x-auto rounded-lg border border-secondary/20">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-secondary/20 bg-primary">
            <th className="sticky left-0 z-10 bg-primary px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground/50 min-w-[120px]">Player</th>
            {STAT_COLS.map((c) => (
              <th key={c.key} className="px-0.5 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground/50 min-w-[38px]">{c.label}</th>
            ))}
            <th className="px-0.5 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground/50 min-w-[38px]">REB</th>
            <th className="px-0.5 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground/50 min-w-[38px]">FG%</th>
            <th className="px-0.5 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground/50 min-w-[38px]">3P%</th>
            <th className="px-0.5 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground/50 min-w-[38px]">FT%</th>
          </tr>
        </thead>
        <tbody>
          {active.map((player) => {
            const s = player.stats ?? emptyStats()
            return (
              <tr key={player.user_id} className="border-b border-secondary/10 hover:bg-white/5">
                <td className="sticky left-0 z-10 bg-background px-3 py-2 min-w-[120px]">
                  <div className="flex items-center gap-1.5">
                    {player.jersey_number !== null && (
                      <span className="text-xs text-foreground/40">#{player.jersey_number}</span>
                    )}
                    <span className="text-xs font-medium text-foreground">{player.name}</span>
                    {canEdit && (
                      <button
                        onClick={() => void onToggleDNP(player.user_id)}
                        className="text-xs text-foreground/30 hover:text-foreground/60"
                        title="Mark as DNP"
                      >DNP</button>
                    )}
                  </div>
                </td>
                {STAT_COLS.map((c) => (
                  <StatCell
                    key={c.key}
                    value={s[c.key]}
                    canEdit={canEdit}
                    onChange={(v) => handleStatChange(player, c.key, v)}
                  />
                ))}
                <td className="px-0.5 py-1 text-center text-xs text-accent min-w-[38px]">{s.orb + s.drb}</td>
                <td className="px-0.5 py-1 text-center text-xs text-foreground/50 min-w-[38px]">{pct(s.fgm, s.fga)}</td>
                <td className="px-0.5 py-1 text-center text-xs text-foreground/50 min-w-[38px]">{pct(s.three_pm, s.three_pa)}</td>
                <td className="px-0.5 py-1 text-center text-xs text-foreground/50 min-w-[38px]">{pct(s.ftm, s.fta)}</td>
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
              <div key={p.user_id} className="flex items-center gap-1 text-sm text-foreground/40">
                {p.jersey_number !== null && <span className="text-xs">#{p.jersey_number}</span>}
                <span>{p.name}</span>
                {canEdit && (
                  <button
                    onClick={() => void onToggleDNP(p.user_id)}
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
  onAction: (userID: string, action: LivePanelStat) => void
  onToggleDNP: (userID: string) => Promise<void>
}) {
  const [activePlayerID, setActivePlayerID] = useState<string | null>(null)
  const active = players.filter((p) => !p.is_dnp)
  const dnp = players.filter((p) => p.is_dnp)
  // Derive from props so the panel always shows the latest stats from the store
  const activePlayer = activePlayerID ? (players.find((p) => p.user_id === activePlayerID) ?? null) : null

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {active.map((player) => {
          const s = player.stats ?? emptyStats()
          return (
            <button
              key={player.user_id}
              onClick={() => setActivePlayerID(player.user_id)}
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
                key={p.user_id}
                onClick={() => void onToggleDNP(p.user_id)}
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
            onAction(activePlayer.user_id, action)
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

  useEffect(() => {
    if (gameID) void fetchGameDetail(gameID)
  }, [gameID, fetchGameDetail])

  const isCoach = !!(currentTeam && user && currentTeam.coach_id === user.id)

  const handleSaveStats = useCallback(async (userID: string, stats: GameStats) => {
    if (!gameID) return
    await upsertStats(gameID, userID, stats)
  }, [gameID, upsertStats])

  const handleToggleDNP = useCallback(async (userID: string) => {
    if (!gameID) return
    await toggleDNP(gameID, userID)
  }, [gameID, toggleDNP])

  const handleLiveAction = useCallback(async (userID: string, action: LivePanelStat) => {
    if (!gameID || !currentGame) return
    const player = currentGame.players.find((p) => p.user_id === userID)
    if (!player) return
    const updated = applyLiveStat(player.stats ?? emptyStats(), action)
    await upsertStats(gameID, userID, updated)
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
          <p className="text-sm text-foreground/50">{game.game_date}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {game.team_score ?? teamScore} — {game.opponent_score ?? '?'}
          </p>
          {isCoach && (
            <div className="mt-1 flex justify-end gap-2">
              <button
                onClick={() => {
                  const opp = window.prompt('Opponent score:', String(game.opponent_score ?? ''))
                  if (opp === null) return
                  const n = parseInt(opp, 10)
                  if (!isNaN(n)) void updateGame(game.id, { opponent_score: n })
                }}
                className="text-xs text-foreground/40 hover:text-foreground"
              >
                Set opp. score
              </button>
            </div>
          )}
        </div>
      </div>

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
