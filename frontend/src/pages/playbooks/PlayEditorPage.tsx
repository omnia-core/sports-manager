import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Stage, Layer, Circle, Arrow, Text, Line, Arc, Rect, Group } from 'react-konva'
import type Konva from 'konva'
import { usePlaybookStore } from '../../stores/playbookStore'
import { useTeamStore } from '../../stores/teamStore'
import { useAuthStore } from '../../stores/authStore'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import {
  migrateDiagram, emptyDiagram, addStepAfter, duplicateStep, deleteStep, updateStep, nextID,
} from '../../lib/diagram'
import type { DiagramJSON, DiagramStep, PlayerToken, Arrow as ArrowType, Annotation } from '../../types'

// ─── Design tokens ──────────────────────────────────────────────────────────
const COLOR_BG = '#020617'
const COLOR_COURT = '#10B981'
const COLOR_OFFENSE = '#10B981'
const COLOR_DEFENSE_FILL = '#0F172A'
const COLOR_DEFENSE_BORDER = '#6EE7B7'
const COLOR_ACCENT = '#6EE7B7'
const COLOR_WHITE = '#F8FAFC'
const COLOR_SELECTED = '#FACC15'

// ─── Court dimensions (FIBA-proportionate: 15m × 28m) ───────────────────────
const CANVAS_W = 800
const SCALE = 760 / 15                                        // px per metre — 760px usable width = 15m
const COURT_H_HALF = Math.round(14 * SCALE)                  // half-court depth ≈ 709px
const COURT_H_FULL = Math.round(28 * SCALE)                  // full-court depth ≈ 1419px
const CANVAS_H = COURT_H_HALF + 40                           // canvas height (half) = 749px
const CANVAS_H_FULL = COURT_H_FULL + 40                      // canvas height (full) = 1459px
const PLAYER_RADIUS = 16
// Konva node name for the floor rect. Uses `name` rather than a custom attr:
// react-konva forwards `attrs` as an ordinary prop, so it lands at
// node.attrs.attrs and the lookup silently misses.
const COURT_BG_NAME = 'court-bg'
// One ball per step, so it needs no generated id — a fixed one lets the shared
// selection and delete paths treat it like any other token.
const BALL_ID = 'ball'
const BALL_RADIUS = 10
const COLOR_BALL = '#F97316'
const COLOR_GHOST = '#64748B'
const COURT_X = 20
const COURT_Y = 20
const COURT_W = CANVAS_W - 40                                 // 760px

// FIBA measurements → pixels
const BASKET_DEPTH    = Math.round(1.575 * SCALE)            // basket centre from endline ≈ 80px
const FT_DEPTH        = Math.round(5.8 * SCALE)              // FT line from endline ≈ 294px
const KEY_W           = Math.round(4.9 * SCALE)              // paint width ≈ 248px
const FT_RADIUS       = Math.round(1.8 * SCALE)              // FT / centre-circle radius ≈ 91px
const THREE_RADIUS    = Math.round(6.75 * SCALE)             // 3-pt arc radius ≈ 342px
const THREE_CX        = Math.round(6.60 * SCALE)             // corner x offset from basket ≈ 334px
const THREE_CY        = Math.round(Math.sqrt(6.75 ** 2 - 6.60 ** 2) * SCALE) // corner y offset ≈ 72px
const THREE_ARC_HALF  = Math.atan2(Math.sqrt(6.75 ** 2 - 6.60 ** 2), 6.60) * (180 / Math.PI) // ≈ 12.1°
const THREE_ARC_ANGLE = 180 - 2 * THREE_ARC_HALF            // ≈ 155.8°
const BACKBOARD_HALF  = Math.round(0.915 * SCALE)            // half of 1.83m backboard ≈ 46px
const BACKBOARD_OFFSET = Math.round(0.375 * SCALE)           // basket-to-backboard gap ≈ 19px
const HOOP_RADIUS     = Math.round(0.225 * SCALE)            // ring radius ≈ 11px

// ─── Court drawing ───────────────────────────────────────────────────────────
function HalfCourt() {
  const cx       = COURT_X + COURT_W / 2                     // horizontal centre = 400
  const endlineY = COURT_Y + COURT_H_HALF                    // bottom endline = 729
  const basketY  = endlineY - BASKET_DEPTH                   // basket centre ≈ 649
  const ftY      = endlineY - FT_DEPTH                       // FT line ≈ 435
  const keyLeft  = cx - KEY_W / 2

  return (
    <>
      {/* Court rectangle */}
      <Rect x={COURT_X} y={COURT_Y} width={COURT_W} height={COURT_H_HALF}
        stroke={COLOR_COURT} strokeWidth={2} fill={COLOR_BG} />

      {/* Paint / key (endline → FT line) */}
      <Rect x={keyLeft} y={ftY} width={KEY_W} height={FT_DEPTH}
        stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />

      {/* FT circle — solid half faces midcourt (upward), dashed half faces basket */}
      <Arc x={cx} y={ftY} innerRadius={FT_RADIUS} outerRadius={FT_RADIUS}
        angle={180} rotation={180} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Arc x={cx} y={ftY} innerRadius={FT_RADIUS} outerRadius={FT_RADIUS}
        angle={180} rotation={0} stroke={COLOR_COURT} strokeWidth={1.5} dash={[6, 4]} fill="transparent" />

      {/* Three-point arc: bottom basket attacks upward.
          rotation = 180 + THREE_ARC_HALF → arc sweeps from left-corner clockwise through top to right-corner */}
      <Arc x={cx} y={basketY} innerRadius={THREE_RADIUS} outerRadius={THREE_RADIUS}
        angle={THREE_ARC_ANGLE} rotation={180 + THREE_ARC_HALF}
        stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />

      {/* Three-point corner lines (endline → where arc starts) */}
      <Line points={[cx - THREE_CX, endlineY, cx - THREE_CX, basketY - THREE_CY]}
        stroke={COLOR_COURT} strokeWidth={1.5} />
      <Line points={[cx + THREE_CX, endlineY, cx + THREE_CX, basketY - THREE_CY]}
        stroke={COLOR_COURT} strokeWidth={1.5} />

      {/* Backboard */}
      <Line points={[cx - BACKBOARD_HALF, basketY + BACKBOARD_OFFSET,
                     cx + BACKBOARD_HALF, basketY + BACKBOARD_OFFSET]}
        stroke={COLOR_COURT} strokeWidth={3} />

      {/* Basket hoop */}
      <Circle x={cx} y={basketY} radius={HOOP_RADIUS}
        stroke={COLOR_COURT} strokeWidth={2} fill="transparent" />

      {/* Centre court mark */}
      <Circle x={cx} y={COURT_Y + 30} radius={5} fill={COLOR_COURT} opacity={0.4} />
    </>
  )
}

function FullCourt() {
  const cx         = COURT_X + COURT_W / 2                   // 400
  const topEnd     = COURT_Y                                  // 20
  const botEnd     = COURT_Y + COURT_H_FULL                  // 1439
  const midY       = Math.round((topEnd + botEnd) / 2)       // 730

  // Top basket (attacks downward toward midcourt)
  const topBasketY = topEnd + BASKET_DEPTH                   // 100
  const topFtY     = topEnd + FT_DEPTH                       // 314

  // Bottom basket (attacks upward toward midcourt — mirrors halfcourt)
  const botBasketY = botEnd - BASKET_DEPTH                   // 1359
  const botFtY     = botEnd - FT_DEPTH                       // 1145

  const keyLeft    = cx - KEY_W / 2

  return (
    <>
      {/* Court rectangle */}
      <Rect x={COURT_X} y={COURT_Y} width={COURT_W} height={COURT_H_FULL}
        stroke={COLOR_COURT} strokeWidth={2} fill={COLOR_BG} />

      {/* Half-court line + centre circle */}
      <Line points={[COURT_X, midY, COURT_X + COURT_W, midY]}
        stroke={COLOR_COURT} strokeWidth={1.5} />
      <Circle x={cx} y={midY} radius={FT_RADIUS}
        stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />

      {/* ── TOP BASKET (attacks downward) ── */}
      <Rect x={keyLeft} y={topEnd} width={KEY_W} height={FT_DEPTH}
        stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      {/* FT circle: solid faces midcourt (downward), dashed faces basket */}
      <Arc x={cx} y={topFtY} innerRadius={FT_RADIUS} outerRadius={FT_RADIUS}
        angle={180} rotation={0} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Arc x={cx} y={topFtY} innerRadius={FT_RADIUS} outerRadius={FT_RADIUS}
        angle={180} rotation={180} stroke={COLOR_COURT} strokeWidth={1.5} dash={[6, 4]} fill="transparent" />
      {/* Three-point arc: rotation = THREE_ARC_HALF → sweeps from right-corner clockwise through bottom to left-corner */}
      <Arc x={cx} y={topBasketY} innerRadius={THREE_RADIUS} outerRadius={THREE_RADIUS}
        angle={THREE_ARC_ANGLE} rotation={THREE_ARC_HALF}
        stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      {/* Corner lines (endline → where arc starts) */}
      <Line points={[cx - THREE_CX, topEnd, cx - THREE_CX, topBasketY + THREE_CY]}
        stroke={COLOR_COURT} strokeWidth={1.5} />
      <Line points={[cx + THREE_CX, topEnd, cx + THREE_CX, topBasketY + THREE_CY]}
        stroke={COLOR_COURT} strokeWidth={1.5} />
      {/* Backboard & hoop */}
      <Line points={[cx - BACKBOARD_HALF, topBasketY - BACKBOARD_OFFSET,
                     cx + BACKBOARD_HALF, topBasketY - BACKBOARD_OFFSET]}
        stroke={COLOR_COURT} strokeWidth={3} />
      <Circle x={cx} y={topBasketY} radius={HOOP_RADIUS}
        stroke={COLOR_COURT} strokeWidth={2} fill="transparent" />

      {/* ── BOTTOM BASKET (attacks upward — mirrors halfcourt) ── */}
      <Rect x={keyLeft} y={botFtY} width={KEY_W} height={FT_DEPTH}
        stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      {/* FT circle: solid faces midcourt (upward), dashed faces basket */}
      <Arc x={cx} y={botFtY} innerRadius={FT_RADIUS} outerRadius={FT_RADIUS}
        angle={180} rotation={180} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Arc x={cx} y={botFtY} innerRadius={FT_RADIUS} outerRadius={FT_RADIUS}
        angle={180} rotation={0} stroke={COLOR_COURT} strokeWidth={1.5} dash={[6, 4]} fill="transparent" />
      {/* Three-point arc: rotation = 180 + THREE_ARC_HALF → sweeps from left-corner clockwise through top to right-corner */}
      <Arc x={cx} y={botBasketY} innerRadius={THREE_RADIUS} outerRadius={THREE_RADIUS}
        angle={THREE_ARC_ANGLE} rotation={180 + THREE_ARC_HALF}
        stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      {/* Corner lines (endline → where arc starts) */}
      <Line points={[cx - THREE_CX, botEnd, cx - THREE_CX, botBasketY - THREE_CY]}
        stroke={COLOR_COURT} strokeWidth={1.5} />
      <Line points={[cx + THREE_CX, botEnd, cx + THREE_CX, botBasketY - THREE_CY]}
        stroke={COLOR_COURT} strokeWidth={1.5} />
      {/* Backboard & hoop */}
      <Line points={[cx - BACKBOARD_HALF, botBasketY + BACKBOARD_OFFSET,
                     cx + BACKBOARD_HALF, botBasketY + BACKBOARD_OFFSET]}
        stroke={COLOR_COURT} strokeWidth={3} />
      <Circle x={cx} y={botBasketY} radius={HOOP_RADIUS}
        stroke={COLOR_COURT} strokeWidth={2} fill="transparent" />
    </>
  )
}

// ─── Arrow styles ─────────────────────────────────────────────────────────────
function arrowStyle(type: ArrowType['type']): { stroke: string; dash: number[]; strokeWidth: number } {
  switch (type) {
    case 'pass':
      return { stroke: COLOR_COURT, dash: [8, 6], strokeWidth: 2 }
    case 'screen':
      return { stroke: COLOR_ACCENT, dash: [], strokeWidth: 4 }
    case 'run':
    default:
      return { stroke: COLOR_COURT, dash: [], strokeWidth: 2 }
  }
}

// ─── Default empty diagram ────────────────────────────────────────────────────


// ─── Tool modes ───────────────────────────────────────────────────────────────
type ToolMode = 'select' | 'arrow' | 'annotation'
type ArrowStep = { step: 'idle' } | { step: 'picking-target'; fromPlayerID: string; fromX: number; fromY: number }

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlayEditorPage() {
  const { playID } = useParams<{ playID: string }>()
  const navigate = useNavigate()
  const { currentPlay, currentPlaybook, isLoading, fetchPlay, savePlay } = usePlaybookStore()
  const { currentTeam, fetchTeam } = useTeamStore()
  const { user } = useAuthStore()

  const [diagram, setDiagram] = useState<DiagramJSON>(emptyDiagram())
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [arrowStep, setArrowStep] = useState<ArrowStep>({ step: 'idle' })
  const [isSaving, setIsSaving] = useState(false)
  const [arrowType, setArrowType] = useState<ArrowType['type']>('run')
  const [annotationEdit, setAnnotationEdit] = useState<{ id: string; text: string } | null>(null)

  const stageRef = useRef<Konva.Stage>(null)

  const isCoach = currentTeam?.coach_id === user?.id

  // Load play on mount
  useEffect(() => {
    if (!playID) return
    void fetchPlay(playID)
  }, [playID, fetchPlay])

  // Populate diagram from loaded play
  useEffect(() => {
    if (currentPlay) {
      setDiagram(migrateDiagram(currentPlay.diagram_json))
      setStepIndex(0)
    }
  }, [currentPlay])

  // If we navigated directly to this URL (e.g. deep link or page refresh),
  // currentTeam may not be set. Once the playbook loads, hydrate the team.
  useEffect(() => {
    if (currentPlaybook && !currentTeam) {
      void fetchTeam(currentPlaybook.team_id)
    }
  }, [currentPlaybook, currentTeam, fetchTeam])

  // ── Helpers ──────────────────────────────────────────────────────────────
  // Every edit applies to the step the coach is looking at. The previous step
  // renders behind it as ghosts, which is what makes a step read as what
  // changed rather than as an unrelated diagram.
  const step: DiagramStep = diagram.steps[stepIndex] ?? diagram.steps[0]
  const ghostStep = stepIndex > 0 ? diagram.steps[stepIndex - 1] : null

  function setStep(fn: (s: DiagramStep) => DiagramStep) {
    setDiagram((d) => updateStep(d, stepIndex, fn))
  }

  // Clearing the interaction state on every step change stops a half-drawn
  // arrow or a selection from one step leaking into the next.
  function resetInteraction() {
    setSelectedID(null)
    setToolMode('select')
    setArrowStep({ step: 'idle' })
  }

  // Navigation within the steps that exist right now.
  function goToStep(i: number) {
    setStepIndex(Math.max(0, Math.min(i, diagram.steps.length - 1)))
    resetInteraction()
  }

  // Used after inserting or removing a step: `diagram` is still the previous
  // value in this closure, so clamping against its length would send the coach
  // back to the step they just left.
  function jumpToStep(i: number) {
    setStepIndex(Math.max(0, i))
    resetInteraction()
  }

  function playerCenter(playerID: string): { x: number; y: number } | null {
    const p = step.players.find((t) => t.id === playerID)
    return p ? { x: p.x, y: p.y } : null
  }

  // ── Add players ───────────────────────────────────────────────────────────
  function addPlayer(team: 'offense' | 'defense') {
    const existing = step.players.filter((p) => p.team === team)
    // Use max existing label number + 1 so labels stay unique after deletions.
    const maxLabel = existing.reduce((max, p) => Math.max(max, parseInt(p.label) || 0), 0)
    const label = String(maxLabel + 1)
    const token: PlayerToken = {
      id: nextID(team === 'offense' ? 'o' : 'd'),
      x: 100 + (existing.length % 5) * 60,
      y: team === 'offense' ? 300 : 180,
      team,
      label,
    }
    setStep((s) => ({ ...s, players: [...s.players, token] }))
    setToolMode('select')
  }

  // ── Ball ──────────────────────────────────────────────────────────────────
  function addBall() {
    setStep((s) => (s.ball ? s : { ...s, ball: { x: CANVAS_W / 2, y: 240 } }))
    setToolMode('select')
  }

  function handleBallDragEnd(x: number, y: number) {
    setStep((s) => ({ ...s, ball: { x, y } }))
  }

  // ── Player drag ───────────────────────────────────────────────────────────
  function handlePlayerDragEnd(id: string, x: number, y: number) {
    setStep((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === id ? { ...p, x, y } : p)),
      // Update arrow start points for arrows originating from this player
      arrows: s.arrows.map((a) => {
        if (a.from !== id) return a
        const pts = [...a.points]
        pts[0] = x
        pts[1] = y
        return { ...a, points: pts }
      }),
    }))
  }

  // ── Annotation drag ───────────────────────────────────────────────────────
  function handleAnnotationDragEnd(id: string, x: number, y: number) {
    setStep((s) => ({
      ...s,
      annotations: s.annotations.map((a) => (a.id === id ? { ...a, x, y } : a)),
    }))
  }

  // ── Annotation text edit ──────────────────────────────────────────────────
  function handleAnnotationDblClick(id: string) {
    const ann = step.annotations.find((a) => a.id === id)
    if (!ann) return
    setAnnotationEdit({ id, text: ann.text })
  }

  function saveAnnotationEdit() {
    if (!annotationEdit) return
    const trimmed = annotationEdit.text.trim()
    if (trimmed) {
      setStep((s) => ({
        ...s,
        annotations: s.annotations.map((a) => (a.id === annotationEdit.id ? { ...a, text: trimmed } : a)),
      }))
    }
    setAnnotationEdit(null)
  }

  // ── Delete selected ───────────────────────────────────────────────────────
  function deleteSelected() {
    if (!selectedID) return
    setStep((s) => ({
      ...s,
      players: s.players.filter((p) => p.id !== selectedID),
      arrows: s.arrows.filter((a) => a.id !== selectedID && a.from !== selectedID),
      annotations: s.annotations.filter((a) => a.id !== selectedID),
      ball: selectedID === BALL_ID ? null : s.ball,
    }))
    setSelectedID(null)
  }

  // ── Arrow creation ────────────────────────────────────────────────────────
  // Both endpoints commit through here: a target player's centre, or a bare
  // point on the floor.
  function commitArrow(toX: number, toY: number) {
    if (arrowStep.step !== 'picking-target') return
    const arrow: ArrowType = {
      id: nextID('a'),
      from: arrowStep.fromPlayerID,
      points: [arrowStep.fromX, arrowStep.fromY, toX, toY],
      type: arrowType,
    }
    setStep((s) => ({ ...s, arrows: [...s.arrows, arrow] }))
    setArrowStep({ step: 'idle' })
    setToolMode('select')
  }

  // ── Player click ──────────────────────────────────────────────────────────
  // Handled on the token's own Group, which closes over the player id. Konva
  // reports e.target as the innermost shape (the Circle), never the Group, so
  // reading an id off the event target would mean walking ancestors.
  function handlePlayerClick(playerID: string) {
    if (toolMode === 'select') {
      setSelectedID(playerID)
      return
    }
    if (toolMode !== 'arrow') return

    const center = playerCenter(playerID)
    if (!center) return

    if (arrowStep.step === 'idle') {
      setArrowStep({ step: 'picking-target', fromPlayerID: playerID, fromX: center.x, fromY: center.y })
    } else if (playerID !== arrowStep.fromPlayerID) {
      commitArrow(center.x, center.y)
    }
  }

  // ── Stage click (empty space) ─────────────────────────────────────────────
  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current
    if (!stage) return

    if (toolMode === 'annotation') {
      const pos = stage.getPointerPosition()
      if (!pos) return
      const annotation: Annotation = {
        id: nextID('n'),
        x: pos.x,
        y: pos.y,
        text: 'Label',
      }
      setStep((s) => ({ ...s, annotations: [...s.annotations, annotation] }))
      setToolMode('select')
      return
    }

    if (toolMode === 'arrow') {
      // Empty floor ends the arrow at that point. Player targets never reach
      // here — they commit through handlePlayerClick.
      if (arrowStep.step === 'picking-target') {
        const pos = stage.getPointerPosition()
        if (!pos) return
        commitArrow(pos.x, pos.y)
      }
      return
    }

    // Select mode: clicking the floor deselects.
    if (e.target === stage || e.target.name() === COURT_BG_NAME) {
      setSelectedID(null)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!playID) return
    setIsSaving(true)
    try {
      await savePlay(playID, diagram)
    } finally {
      setIsSaving(false)
    }
  }, [playID, diagram, savePlay])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
        deleteSelected()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedID, diagram, handleSave]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !currentPlay) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const canEdit = isCoach
  const canvasH = diagram.background === 'fullcourt' ? CANVAS_H_FULL : CANVAS_H

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {currentPlaybook && (
            <>
              <button
                onClick={() => navigate(`/playbooks/${currentPlaybook.id}`)}
                className="text-sm text-foreground/40 hover:text-foreground"
              >
                {currentPlaybook.name}
              </button>
              <span className="text-foreground/20">/</span>
            </>
          )}
          <h1 className="text-xl font-bold text-foreground">{currentPlay.name}</h1>
        </div>
        {canEdit && (
          <Button onClick={() => void handleSave()} isLoading={isSaving}>
            Save
          </Button>
        )}
      </div>

      {/* Editor layout */}
      <div className="flex gap-4">
        {/* Toolbar */}
        {canEdit && (
          <div className="flex w-44 flex-shrink-0 flex-col gap-2 rounded-lg border border-secondary/20 bg-primary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">Court</p>
            <div className="flex gap-1">
              <button
                onClick={() => setDiagram((d) => ({ ...d, background: 'halfcourt' }))}
                className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  diagram.background === 'halfcourt'
                    ? 'bg-secondary text-background'
                    : 'bg-white/5 text-foreground/60 hover:bg-white/10'
                }`}
              >
                Half
              </button>
              <button
                onClick={() => setDiagram((d) => ({ ...d, background: 'fullcourt' }))}
                className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  diagram.background === 'fullcourt'
                    ? 'bg-secondary text-background'
                    : 'bg-white/5 text-foreground/60 hover:bg-white/10'
                }`}
              >
                Full
              </button>
            </div>

            <div className="my-1 border-t border-secondary/10" />

            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">Players</p>
            <button
              onClick={() => addPlayer('offense')}
              className="rounded bg-secondary/20 px-2 py-1.5 text-left text-xs font-medium text-accent hover:bg-secondary/30"
            >
              + Offense
            </button>
            <button
              onClick={() => addPlayer('defense')}
              className="rounded border border-secondary/30 bg-transparent px-2 py-1.5 text-left text-xs font-medium text-accent hover:bg-secondary/10"
            >
              + Defense
            </button>
            <button
              onClick={addBall}
              disabled={step.ball !== null}
              className="rounded border border-orange-500/40 bg-transparent px-2 py-1.5 text-left text-xs font-medium text-orange-400 hover:bg-orange-500/10 disabled:opacity-30"
              title={step.ball ? 'This step already has the ball' : 'Place the ball on the court'}
            >
              + Ball
            </button>

            <div className="my-1 border-t border-secondary/10" />

            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">Draw</p>
            <div className="flex flex-col gap-1">
              {(['run', 'pass', 'screen'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setArrowType(t)
                    setToolMode('arrow')
                    setArrowStep({ step: 'idle' })
                  }}
                  className={`rounded px-2 py-1.5 text-left text-xs font-medium capitalize transition-colors ${
                    toolMode === 'arrow' && arrowType === t
                      ? 'bg-secondary text-background'
                      : 'bg-white/5 text-foreground/60 hover:bg-white/10'
                  }`}
                >
                  {t === 'run' ? 'Run' : t === 'pass' ? 'Pass' : 'Screen'}
                </button>
              ))}
            </div>

            <div className="my-1 border-t border-secondary/10" />

            <button
              onClick={() => {
                setToolMode('annotation')
                setArrowStep({ step: 'idle' })
              }}
              className={`rounded px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                toolMode === 'annotation'
                  ? 'bg-secondary text-background'
                  : 'bg-white/5 text-foreground/60 hover:bg-white/10'
              }`}
            >
              + Annotation
            </button>

            <div className="my-1 border-t border-secondary/10" />

            <button
              onClick={deleteSelected}
              disabled={!selectedID}
              className="rounded bg-red-900/30 px-2 py-1.5 text-left text-xs font-medium text-red-400 hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete selected
            </button>

            {toolMode !== 'select' && (
              <button
                onClick={() => {
                  setToolMode('select')
                  setArrowStep({ step: 'idle' })
                }}
                className="rounded bg-white/5 px-2 py-1.5 text-left text-xs font-medium text-foreground/50 hover:bg-white/10"
              >
                Cancel
              </button>
            )}

            {arrowStep.step === 'picking-target' && (
              <p className="text-xs text-accent">Click destination player or empty court</p>
            )}
          </div>
        )}

        {/* Step bar + canvas share a column so the bar sits above the court */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Step bar */}
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-secondary/20 bg-primary px-3 py-2">
            <button
              onClick={() => goToStep(stepIndex - 1)}
              disabled={stepIndex === 0}
              className="rounded px-2 py-1 text-sm text-foreground/60 hover:bg-white/10 disabled:opacity-25"
              aria-label="Previous step"
            >
              ‹
            </button>
            <span className="min-w-[92px] text-center text-xs font-medium tabular-nums text-foreground">
              Step {stepIndex + 1} / {diagram.steps.length}
            </span>
            <button
              onClick={() => goToStep(stepIndex + 1)}
              disabled={stepIndex >= diagram.steps.length - 1}
              className="rounded px-2 py-1 text-sm text-foreground/60 hover:bg-white/10 disabled:opacity-25"
              aria-label="Next step"
            >
              ›
            </button>

            {canEdit && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => {
                    setDiagram((d) => addStepAfter(d, stepIndex))
                    jumpToStep(stepIndex + 1)
                  }}
                  className="rounded bg-secondary/20 px-2 py-1 text-xs font-medium text-accent hover:bg-secondary/30"
                >
                  + Add step
                </button>
                <button
                  onClick={() => {
                    setDiagram((d) => duplicateStep(d, stepIndex))
                    jumpToStep(stepIndex + 1)
                  }}
                  className="rounded bg-white/5 px-2 py-1 text-xs text-foreground/60 hover:bg-white/10"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    setDiagram((d) => deleteStep(d, stepIndex))
                    jumpToStep(Math.max(0, stepIndex - 1))
                  }}
                  disabled={diagram.steps.length <= 1}
                  className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-25"
                >
                  Delete step
                </button>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div
            className="overflow-auto rounded-lg border border-secondary/20"
            style={{ background: COLOR_BG }}
          >
            <Stage
              ref={stageRef}
              width={CANVAS_W}
              height={canvasH}
              onClick={handleStageClick}
              style={{ cursor: toolMode !== 'select' ? 'crosshair' : 'default' }}
            >
              <Layer>
                {/* Court background */}
                <Rect x={0} y={0} width={CANVAS_W} height={canvasH} fill={COLOR_BG} listening={true} name={COURT_BG_NAME} />
                {/* Court markings are decoration. Excluded from hit testing so a
                    click on the floor always lands on the named background above
                    rather than on a line, an arc, or the court's own fill. */}
                <Group listening={false}>
                  {diagram.background === 'halfcourt' ? <HalfCourt /> : <FullCourt />}
                </Group>

                {/* Ghosts of the previous step — never interactive, so a click
                    on one falls through to the floor. */}
                {ghostStep && (
                  <Group listening={false} opacity={0.28}>
                    {ghostStep.players.map((p) => (
                      <Circle
                        key={`ghost-${p.id}`}
                        x={p.x}
                        y={p.y}
                        radius={PLAYER_RADIUS}
                        stroke={COLOR_GHOST}
                        strokeWidth={2}
                        dash={[4, 3]}
                        fill="transparent"
                      />
                    ))}
                    {ghostStep.ball && (
                      <Circle
                        x={ghostStep.ball.x}
                        y={ghostStep.ball.y}
                        radius={BALL_RADIUS}
                        stroke={COLOR_GHOST}
                        strokeWidth={2}
                        dash={[4, 3]}
                        fill="transparent"
                      />
                    )}
                  </Group>
                )}

                {/* Arrows */}
                {step.arrows.map((arrow) => {
                  const style = arrowStyle(arrow.type)
                  const isSelected = selectedID === arrow.id
                  return (
                    <Arrow
                      key={arrow.id}
                      points={arrow.points}
                      stroke={isSelected ? COLOR_SELECTED : style.stroke}
                      strokeWidth={style.strokeWidth}
                      dash={style.dash}
                      fill={isSelected ? COLOR_SELECTED : style.stroke}
                      pointerLength={10}
                      pointerWidth={8}
                      onClick={() => setSelectedID(arrow.id)}
                    />
                  )
                })}

                {/* Player tokens */}
                {step.players.map((player) => {
                  const isOffense = player.team === 'offense'
                  const isSelected = selectedID === player.id
                  const isArrowSource =
                    arrowStep.step === 'picking-target' && arrowStep.fromPlayerID === player.id
                  return (
                    <Group
                      key={player.id}
                      x={player.x}
                      y={player.y}
                      draggable={canEdit}
                      onDragEnd={(e) => handlePlayerDragEnd(player.id, e.target.x(), e.target.y())}
                      onClick={(e) => {
                        e.cancelBubble = true
                        handlePlayerClick(player.id)
                      }}
                    >
                      {/* Selection ring */}
                      {(isSelected || isArrowSource) && (
                        <Circle
                          radius={PLAYER_RADIUS + 4}
                          stroke={isArrowSource ? COLOR_ACCENT : COLOR_SELECTED}
                          strokeWidth={2}
                          fill="transparent"
                        />
                      )}
                      {/* Token circle */}
                      <Circle
                        radius={PLAYER_RADIUS}
                        fill={isOffense ? COLOR_OFFENSE : COLOR_DEFENSE_FILL}
                        stroke={isOffense ? 'transparent' : COLOR_DEFENSE_BORDER}
                        strokeWidth={2}
                      />
                      {/* Label */}
                      <Text
                        text={player.label}
                        fontSize={12}
                        fontStyle="bold"
                        fill={isOffense ? COLOR_WHITE : COLOR_ACCENT}
                        width={PLAYER_RADIUS * 2}
                        height={PLAYER_RADIUS * 2}
                        offsetX={PLAYER_RADIUS}
                        offsetY={PLAYER_RADIUS}
                        align="center"
                        verticalAlign="middle"
                        listening={false}
                      />
                    </Group>
                  )
                })}

                {/* Annotations */}
                {step.annotations.map((ann) => {
                  const isSelected = selectedID === ann.id
                  return (
                    <Text
                      key={ann.id}
                      x={ann.x}
                      y={ann.y}
                      text={ann.text}
                      fontSize={13}
                      fill={isSelected ? COLOR_SELECTED : COLOR_WHITE}
                      draggable={canEdit}
                      onDragEnd={(e) => handleAnnotationDragEnd(ann.id, e.target.x(), e.target.y())}
                      onClick={(e) => {
                        e.cancelBubble = true
                        setSelectedID(ann.id)
                      }}
                      onDblClick={(e) => {
                        e.cancelBubble = true
                        if (canEdit) handleAnnotationDblClick(ann.id)
                      }}
                      padding={4}
                      title={canEdit ? 'Double-click to edit text' : undefined}
                    />
                  )
                })}

                {/* Ball — drawn last so it reads as being on top of the play */}
                {step.ball && (
                  <Group
                    x={step.ball.x}
                    y={step.ball.y}
                    draggable={canEdit}
                    onDragEnd={(e) => handleBallDragEnd(e.target.x(), e.target.y())}
                    onClick={(e) => {
                      e.cancelBubble = true
                      if (toolMode === 'select') setSelectedID(BALL_ID)
                    }}
                  >
                    {selectedID === BALL_ID && (
                      <Circle radius={BALL_RADIUS + 4} stroke={COLOR_SELECTED} strokeWidth={2} fill="transparent" />
                    )}
                    <Circle radius={BALL_RADIUS} fill={COLOR_BALL} />
                    {/* Two seams, so it reads as a ball rather than a dot */}
                    <Line points={[-BALL_RADIUS, 0, BALL_RADIUS, 0]} stroke={COLOR_BG} strokeWidth={1.5} listening={false} />
                    <Line points={[0, -BALL_RADIUS, 0, BALL_RADIUS]} stroke={COLOR_BG} strokeWidth={1.5} listening={false} />
                  </Group>
                )}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* Annotation edit modal */}
      {annotationEdit && (
        <Modal title="Edit annotation" onClose={() => setAnnotationEdit(null)}>
          <div className="flex flex-col gap-4">
            <textarea
              autoFocus
              className="w-full rounded-md border border-secondary/30 bg-background px-3 py-2 text-sm text-foreground placeholder-foreground/30 focus:border-secondary focus:outline-none resize-none"
              rows={3}
              value={annotationEdit.text}
              onChange={(e) => setAnnotationEdit({ ...annotationEdit, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveAnnotationEdit() }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAnnotationEdit(null)}>Cancel</Button>
              <Button onClick={saveAnnotationEdit}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-3 text-xs text-foreground/30">
        <span>
          Tool:{' '}
          <span className="text-foreground/50 capitalize">
            {toolMode === 'arrow' ? `${arrowType} arrow` : toolMode}
          </span>
        </span>
        {canEdit && <span>Double-click annotation to edit text</span>}
        <span className="ml-auto">
          Step {stepIndex + 1} of {diagram.steps.length} · {step.players.length} players · {step.arrows.length} arrows · {step.annotations.length} annotations
        </span>
      </div>
    </div>
  )
}
