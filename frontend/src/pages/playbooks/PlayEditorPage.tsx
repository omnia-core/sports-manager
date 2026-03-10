import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Stage, Layer, Circle, Arrow, Text, Line, Arc, Rect, Group } from 'react-konva'
import type Konva from 'konva'
import { usePlaybookStore } from '../../stores/playbookStore'
import { useTeamStore } from '../../stores/teamStore'
import { useAuthStore } from '../../stores/authStore'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import type { DiagramJSON, PlayerToken, Arrow as ArrowType, Annotation } from '../../types'

// ─── Design tokens ──────────────────────────────────────────────────────────
const COLOR_BG = '#020617'
const COLOR_COURT = '#10B981'
const COLOR_OFFENSE = '#10B981'
const COLOR_DEFENSE_FILL = '#0F172A'
const COLOR_DEFENSE_BORDER = '#6EE7B7'
const COLOR_ACCENT = '#6EE7B7'
const COLOR_WHITE = '#F8FAFC'
const COLOR_SELECTED = '#FACC15'

// ─── Court dimensions (canvas coords) ───────────────────────────────────────
const CANVAS_W = 800
const CANVAS_H = 500
const PLAYER_RADIUS = 16

// Halfcourt: court fills the canvas
const HC = {
  x: 20,
  y: 20,
  w: CANVAS_W - 40,
  h: CANVAS_H - 40,
  // basket position (bottom-center)
  basketX: CANVAS_W / 2,
  basketY: CANVAS_H - 20 - 40,
  // three-point arc: NBA ~23.75ft; scale proportionally
  threeRadius: 160,
  // key/paint
  keyW: 160,
  keyH: 190,
  // free-throw circle
  ftRadius: 60,
}

// ─── Court drawing ───────────────────────────────────────────────────────────
function HalfCourt() {
  const basketX = HC.basketX
  const basketY = HC.basketY
  const keyLeft = basketX - HC.keyW / 2
  const keyTop = basketY - HC.keyH
  const ftCY = keyTop

  return (
    <>
      {/* Court rectangle */}
      <Rect
        x={HC.x}
        y={HC.y}
        width={HC.w}
        height={HC.h}
        stroke={COLOR_COURT}
        strokeWidth={2}
        fill={COLOR_BG}
      />

      {/* Paint / key */}
      <Rect
        x={keyLeft}
        y={keyTop}
        width={HC.keyW}
        height={HC.keyH}
        stroke={COLOR_COURT}
        strokeWidth={1.5}
        fill="transparent"
      />

      {/* Free-throw circle (top half only — dashed bottom half) */}
      <Arc
        x={basketX}
        y={ftCY}
        innerRadius={HC.ftRadius}
        outerRadius={HC.ftRadius}
        angle={180}
        rotation={0}
        stroke={COLOR_COURT}
        strokeWidth={1.5}
        fill="transparent"
      />
      <Arc
        x={basketX}
        y={ftCY}
        innerRadius={HC.ftRadius}
        outerRadius={HC.ftRadius}
        angle={180}
        rotation={180}
        stroke={COLOR_COURT}
        strokeWidth={1.5}
        dash={[6, 4]}
        fill="transparent"
      />

      {/* Three-point arc */}
      <Arc
        x={basketX}
        y={basketY}
        innerRadius={HC.threeRadius}
        outerRadius={HC.threeRadius}
        angle={166}
        rotation={-83}
        stroke={COLOR_COURT}
        strokeWidth={1.5}
        fill="transparent"
      />

      {/* Three-point corner lines */}
      <Line
        points={[basketX - HC.threeRadius - 4, basketY, basketX - HC.threeRadius - 4, HC.y + HC.h]}
        stroke={COLOR_COURT}
        strokeWidth={1.5}
      />
      <Line
        points={[basketX + HC.threeRadius + 4, basketY, basketX + HC.threeRadius + 4, HC.y + HC.h]}
        stroke={COLOR_COURT}
        strokeWidth={1.5}
      />

      {/* Basket backboard */}
      <Line
        points={[basketX - 24, basketY + 10, basketX + 24, basketY + 10]}
        stroke={COLOR_COURT}
        strokeWidth={3}
      />

      {/* Basket hoop */}
      <Circle
        x={basketX}
        y={basketY}
        radius={10}
        stroke={COLOR_COURT}
        strokeWidth={2}
        fill="transparent"
      />

      {/* Center court mark */}
      <Circle x={basketX} y={HC.y + 30} radius={5} fill={COLOR_COURT} opacity={0.4} />
    </>
  )
}

function FullCourt() {
  // Full court: two half courts mirrored top/bottom
  const midY = CANVAS_H / 2
  const bTopX = HC.basketX
  const bTopY = HC.y + 40
  const bBotX = HC.basketX
  const bBotY = CANVAS_H - HC.y - 40

  const keyW = HC.keyW
  const keyH = HC.keyH

  // Top basket (pointing down)
  const topKeyLeft = bTopX - keyW / 2
  const topKeyTop = bTopY
  const topFtCY = bTopY + keyH

  // Bottom basket (pointing up)
  const botKeyLeft = bBotX - keyW / 2
  const botKeyTop = bBotY - keyH
  const botFtCY = botKeyTop

  return (
    <>
      {/* Court rectangle */}
      <Rect
        x={HC.x}
        y={HC.y}
        width={HC.w}
        height={HC.h}
        stroke={COLOR_COURT}
        strokeWidth={2}
        fill={COLOR_BG}
      />

      {/* Half-court line */}
      <Line
        points={[HC.x, midY, HC.x + HC.w, midY]}
        stroke={COLOR_COURT}
        strokeWidth={1.5}
      />

      {/* Center circle */}
      <Circle x={HC.basketX} y={midY} radius={50} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />

      {/* Top key */}
      <Rect x={topKeyLeft} y={topKeyTop} width={keyW} height={keyH} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Arc x={bTopX} y={topFtCY} innerRadius={HC.ftRadius} outerRadius={HC.ftRadius} angle={180} rotation={180} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Arc x={bTopX} y={topFtCY} innerRadius={HC.ftRadius} outerRadius={HC.ftRadius} angle={180} rotation={0} stroke={COLOR_COURT} strokeWidth={1.5} dash={[6, 4]} fill="transparent" />
      <Arc x={bTopX} y={bTopY} innerRadius={HC.threeRadius} outerRadius={HC.threeRadius} angle={166} rotation={97} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Line points={[bTopX - HC.threeRadius - 4, bTopY, bTopX - HC.threeRadius - 4, HC.y]} stroke={COLOR_COURT} strokeWidth={1.5} />
      <Line points={[bTopX + HC.threeRadius + 4, bTopY, bTopX + HC.threeRadius + 4, HC.y]} stroke={COLOR_COURT} strokeWidth={1.5} />
      <Line points={[bTopX - 24, bTopY - 10, bTopX + 24, bTopY - 10]} stroke={COLOR_COURT} strokeWidth={3} />
      <Circle x={bTopX} y={bTopY} radius={10} stroke={COLOR_COURT} strokeWidth={2} fill="transparent" />

      {/* Bottom key */}
      <Rect x={botKeyLeft} y={botKeyTop} width={keyW} height={keyH} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Arc x={bBotX} y={botFtCY} innerRadius={HC.ftRadius} outerRadius={HC.ftRadius} angle={180} rotation={0} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Arc x={bBotX} y={botFtCY} innerRadius={HC.ftRadius} outerRadius={HC.ftRadius} angle={180} rotation={180} stroke={COLOR_COURT} strokeWidth={1.5} dash={[6, 4]} fill="transparent" />
      <Arc x={bBotX} y={bBotY} innerRadius={HC.threeRadius} outerRadius={HC.threeRadius} angle={166} rotation={-83} stroke={COLOR_COURT} strokeWidth={1.5} fill="transparent" />
      <Line points={[bBotX - HC.threeRadius - 4, bBotY, bBotX - HC.threeRadius - 4, HC.y + HC.h]} stroke={COLOR_COURT} strokeWidth={1.5} />
      <Line points={[bBotX + HC.threeRadius + 4, bBotY, bBotX + HC.threeRadius + 4, HC.y + HC.h]} stroke={COLOR_COURT} strokeWidth={1.5} />
      <Line points={[bBotX - 24, bBotY + 10, bBotX + 24, bBotY + 10]} stroke={COLOR_COURT} strokeWidth={3} />
      <Circle x={bBotX} y={bBotY} radius={10} stroke={COLOR_COURT} strokeWidth={2} fill="transparent" />
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
function emptyDiagram(): DiagramJSON {
  return { background: 'halfcourt', players: [], arrows: [], annotations: [] }
}

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
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [arrowStep, setArrowStep] = useState<ArrowStep>({ step: 'idle' })
  const [isSaving, setIsSaving] = useState(false)
  const [arrowType, setArrowType] = useState<ArrowType['type']>('run')

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
      setDiagram(currentPlay.diagram_json ?? emptyDiagram())
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
  function nextID(prefix: string): string {
    return `${prefix}${crypto.randomUUID()}`
  }

  function playerCenter(playerID: string): { x: number; y: number } | null {
    const p = diagram.players.find((t) => t.id === playerID)
    return p ? { x: p.x, y: p.y } : null
  }

  // ── Add players ───────────────────────────────────────────────────────────
  function addPlayer(team: 'offense' | 'defense') {
    const existing = diagram.players.filter((p) => p.team === team)
    const label = String(existing.length + 1)
    const token: PlayerToken = {
      id: nextID(team === 'offense' ? 'o' : 'd'),
      x: 100 + existing.length * 60,
      y: team === 'offense' ? 300 : 180,
      team,
      label,
    }
    setDiagram((d) => ({ ...d, players: [...d.players, token] }))
    setToolMode('select')
  }

  // ── Player drag ───────────────────────────────────────────────────────────
  function handlePlayerDragEnd(id: string, x: number, y: number) {
    setDiagram((d) => ({
      ...d,
      players: d.players.map((p) => (p.id === id ? { ...p, x, y } : p)),
      // Update arrow start points for arrows originating from this player
      arrows: d.arrows.map((a) => {
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
    setDiagram((d) => ({
      ...d,
      annotations: d.annotations.map((a) => (a.id === id ? { ...a, x, y } : a)),
    }))
  }

  // ── Delete selected ───────────────────────────────────────────────────────
  function deleteSelected() {
    if (!selectedID) return
    setDiagram((d) => ({
      ...d,
      players: d.players.filter((p) => p.id !== selectedID),
      arrows: d.arrows.filter((a) => a.id !== selectedID && a.from !== selectedID),
      annotations: d.annotations.filter((a) => a.id !== selectedID),
    }))
    setSelectedID(null)
  }

  // ── Stage click (arrow mode & annotation mode) ────────────────────────────
  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const target = e.target
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
      setDiagram((d) => ({ ...d, annotations: [...d.annotations, annotation] }))
      setToolMode('select')
      return
    }

    if (toolMode === 'arrow') {
      // Check if clicked on a player token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const playerID = (target as any).attrs?.['data-player-id'] as string | undefined
      if (!playerID) {
        // Clicked empty space — cancel if picking target
        if (arrowStep.step === 'picking-target') {
          const pos = stage.getPointerPosition()
          if (!pos) return
          const arrow: ArrowType = {
            id: nextID('a'),
            from: arrowStep.fromPlayerID,
            points: [arrowStep.fromX, arrowStep.fromY, pos.x, pos.y],
            type: arrowType,
          }
          setDiagram((d) => ({ ...d, arrows: [...d.arrows, arrow] }))
          setArrowStep({ step: 'idle' })
          setToolMode('select')
        }
        return
      }

      const center = playerCenter(playerID)
      if (!center) return

      if (arrowStep.step === 'idle') {
        setArrowStep({ step: 'picking-target', fromPlayerID: playerID, fromX: center.x, fromY: center.y })
      } else if (arrowStep.step === 'picking-target' && playerID !== arrowStep.fromPlayerID) {
        const arrow: ArrowType = {
          id: nextID('a'),
          from: arrowStep.fromPlayerID,
          points: [arrowStep.fromX, arrowStep.fromY, center.x, center.y],
          type: arrowType,
        }
        setDiagram((d) => ({ ...d, arrows: [...d.arrows, arrow] }))
        setArrowStep({ step: 'idle' })
        setToolMode('select')
      }
      return
    }

    // Select mode: click on empty stage deselects
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const isCourtBg = (target as any).attrs?.['data-court'] === true
    if (target === stage || isCourtBg) {
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

        {/* Canvas */}
        <div
          className="overflow-hidden rounded-lg border border-secondary/20"
          style={{ background: COLOR_BG }}
        >
          <Stage
            ref={stageRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={handleStageClick}
            style={{ cursor: toolMode !== 'select' ? 'crosshair' : 'default' }}
          >
            <Layer>
              {/* Court background */}
              <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill={COLOR_BG} listening={true} attrs={{ 'data-court': true }} />
              {diagram.background === 'halfcourt' ? <HalfCourt /> : <FullCourt />}

              {/* Arrows */}
              {diagram.arrows.map((arrow) => {
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
              {diagram.players.map((player) => {
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
                      if (toolMode === 'select') {
                        setSelectedID(player.id)
                      }
                      // arrow mode clicks handled in stage click via data attr
                    }}
                    attrs={{ 'data-player-id': player.id }}
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
              {diagram.annotations.map((ann) => {
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
                    padding={4}
                  />
                )
              })}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 text-xs text-foreground/30">
        <span>
          Tool:{' '}
          <span className="text-foreground/50 capitalize">
            {toolMode === 'arrow' ? `${arrowType} arrow` : toolMode}
          </span>
        </span>
        {selectedID && <span>Selected: <span className="text-accent">{selectedID}</span></span>}
        <span className="ml-auto">
          {diagram.players.length} players · {diagram.arrows.length} arrows · {diagram.annotations.length} annotations
        </span>
      </div>
    </div>
  )
}
