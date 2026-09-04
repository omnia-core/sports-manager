import type { DiagramJSON, DiagramStep, PlayerToken, Arrow, Annotation, BallToken } from '../types'

// Pure helpers for the play diagram. Kept out of the editor component so the
// migration in particular can be tested: it runs against every play a coach has
// ever saved, and getting it wrong destroys their work the first time they open
// the play.

let idCounter = 0

export function nextID(prefix: string): string {
  idCounter += 1
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`
}

export function emptyStep(name = 'Step 1'): DiagramStep {
  return { id: nextID('s'), name, players: [], arrows: [], annotations: [], ball: null }
}

export function emptyDiagram(): DiagramJSON {
  return { background: 'halfcourt', steps: [emptyStep()] }
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function isBall(v: unknown): v is BallToken {
  if (typeof v !== 'object' || v === null) return false
  const b = v as Record<string, unknown>
  return typeof b.x === 'number' && typeof b.y === 'number'
}

function normaliseStep(raw: unknown, fallbackName: string): DiagramStep {
  const s = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    id: typeof s.id === 'string' && s.id !== '' ? s.id : nextID('s'),
    name: typeof s.name === 'string' && s.name !== '' ? s.name : fallbackName,
    players: asArray<PlayerToken>(s.players),
    arrows: asArray<Arrow>(s.arrows),
    annotations: asArray<Annotation>(s.annotations),
    ball: isBall(s.ball) ? { x: s.ball.x, y: s.ball.y } : null,
  }
}

// migrateDiagram accepts anything the API might hand back — a current diagram,
// a pre-sequences flat one, null, or something malformed — and always returns a
// usable diagram with at least one step. It never throws and never drops
// tokens that were present.
export function migrateDiagram(raw: unknown): DiagramJSON {
  if (typeof raw !== 'object' || raw === null) return emptyDiagram()

  const d = raw as Record<string, unknown>
  const background = d.background === 'fullcourt' ? 'fullcourt' : 'halfcourt'

  if (Array.isArray(d.steps) && d.steps.length > 0) {
    return {
      background,
      steps: d.steps.map((s, i) => normaliseStep(s, `Step ${i + 1}`)),
    }
  }

  // Pre-sequences: one flat frame becomes step 1, with everything intact.
  return { background, steps: [normaliseStep(d, 'Step 1')] }
}

// addStepAfter carries player and ball positions forward and clears the
// drawings. Arrows describe movement *within* a step, so copying them would
// assert the same movement happens twice.
export function addStepAfter(diagram: DiagramJSON, index: number): DiagramJSON {
  const source = diagram.steps[index]
  const next: DiagramStep = {
    id: nextID('s'),
    name: `Step ${diagram.steps.length + 1}`,
    players: source ? source.players.map((p) => ({ ...p })) : [],
    arrows: [],
    annotations: [],
    ball: source?.ball ? { ...source.ball } : null,
  }
  const steps = [...diagram.steps]
  steps.splice(index + 1, 0, next)
  return { ...diagram, steps: renumber(steps) }
}

// duplicateStep copies a step whole, drawings included — the coach wants a
// variation on what is already there.
export function duplicateStep(diagram: DiagramJSON, index: number): DiagramJSON {
  const source = diagram.steps[index]
  if (!source) return diagram
  const copy: DiagramStep = {
    id: nextID('s'),
    name: source.name,
    players: source.players.map((p) => ({ ...p })),
    arrows: source.arrows.map((a) => ({ ...a, id: nextID('a'), points: [...a.points] })),
    annotations: source.annotations.map((n) => ({ ...n, id: nextID('n') })),
    ball: source.ball ? { ...source.ball } : null,
  }
  const steps = [...diagram.steps]
  steps.splice(index + 1, 0, copy)
  return { ...diagram, steps: renumber(steps) }
}

// deleteStep never empties the sequence — a play with no steps has nothing to
// render and no way back.
export function deleteStep(diagram: DiagramJSON, index: number): DiagramJSON {
  if (diagram.steps.length <= 1) return diagram
  const steps = diagram.steps.filter((_, i) => i !== index)
  return { ...diagram, steps: renumber(steps) }
}

// Names are positional, so they are rewritten whenever the order changes. A
// step the coach has renamed by hand is left alone.
function renumber(steps: DiagramStep[]): DiagramStep[] {
  return steps.map((s, i) => (/^Step \d+$/.test(s.name) ? { ...s, name: `Step ${i + 1}` } : s))
}

export function updateStep(
  diagram: DiagramJSON,
  index: number,
  fn: (step: DiagramStep) => DiagramStep,
): DiagramJSON {
  return { ...diagram, steps: diagram.steps.map((s, i) => (i === index ? fn(s) : s)) }
}
