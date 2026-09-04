import { describe, it, expect } from 'vitest'
import { migrateDiagram, addStepAfter, duplicateStep, deleteStep, emptyDiagram } from './diagram'
import type { PlayerToken } from '../types'

const player = (id: string, x: number, y: number): PlayerToken => ({
  id, x, y, team: 'offense', label: id,
})

// migrateDiagram runs against every play a coach has ever saved. A mistake here
// destroys their work the first time they open the play, so the legacy shape is
// covered exhaustively.
describe('migrateDiagram', () => {
  it('wraps a pre-sequences flat diagram as step 1, keeping every token', () => {
    const legacy = {
      background: 'halfcourt',
      players: [player('o1', 10, 20), player('o2', 30, 40)],
      arrows: [{ id: 'a1', from: 'o1', points: [10, 20, 30, 40], type: 'run' }],
      annotations: [{ id: 'n1', x: 5, y: 5, text: 'Set screen here' }],
    }
    const d = migrateDiagram(legacy)

    expect(d.steps).toHaveLength(1)
    expect(d.background).toBe('halfcourt')
    expect(d.steps[0].players).toHaveLength(2)
    expect(d.steps[0].players[0]).toEqual(player('o1', 10, 20))
    expect(d.steps[0].arrows).toHaveLength(1)
    expect(d.steps[0].annotations[0].text).toBe('Set screen here')
    expect(d.steps[0].ball).toBeNull()
  })

  it('preserves a fullcourt background through migration', () => {
    expect(migrateDiagram({ background: 'fullcourt', players: [] }).background).toBe('fullcourt')
  })

  it('leaves an already-migrated diagram alone', () => {
    const current = {
      background: 'halfcourt',
      steps: [
        { id: 's1', name: 'Entry', players: [player('o1', 1, 2)], arrows: [], annotations: [], ball: { x: 7, y: 8 } },
        { id: 's2', name: 'Step 2', players: [player('o1', 3, 4)], arrows: [], annotations: [], ball: null },
      ],
    }
    const d = migrateDiagram(current)

    expect(d.steps).toHaveLength(2)
    expect(d.steps[0].name).toBe('Entry')
    expect(d.steps[0].ball).toEqual({ x: 7, y: 8 })
    expect(d.steps[1].players[0].x).toBe(3)
  })

  it('returns a usable one-step diagram for null, which is what an unsaved play has', () => {
    const d = migrateDiagram(null)
    expect(d.steps).toHaveLength(1)
    expect(d.steps[0].players).toEqual([])
  })

  it.each([
    ['undefined', undefined],
    ['a string', 'nonsense'],
    ['an empty object', {}],
    ['steps set to null', { steps: null }],
    ['steps set to an empty array', { steps: [] }],
    ['steps set to a non-array', { steps: 'nope' }],
  ])('never throws and always yields at least one step for %s', (_label, input) => {
    const d = migrateDiagram(input)
    expect(d.steps.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(d.steps[0].players)).toBe(true)
  })

  it('tolerates a step missing its arrays rather than crashing the editor', () => {
    const d = migrateDiagram({ steps: [{ id: 's1' }] })
    expect(d.steps[0].players).toEqual([])
    expect(d.steps[0].arrows).toEqual([])
    expect(d.steps[0].annotations).toEqual([])
    expect(d.steps[0].name).toBe('Step 1')
  })

  it('discards a malformed ball instead of rendering one at NaN', () => {
    const d = migrateDiagram({ steps: [{ id: 's1', ball: { x: 'left' } }] })
    expect(d.steps[0].ball).toBeNull()
  })
})

describe('addStepAfter', () => {
  const base = migrateDiagram({
    players: [player('o1', 10, 20)],
    arrows: [{ id: 'a1', from: 'o1', points: [10, 20, 50, 60], type: 'run' }],
    annotations: [{ id: 'n1', x: 1, y: 1, text: 'note' }],
  })

  it('carries player positions forward so the next step starts where the last ended', () => {
    const d = addStepAfter(base, 0)
    expect(d.steps).toHaveLength(2)
    expect(d.steps[1].players).toEqual(base.steps[0].players)
  })

  it('clears arrows and annotations, which describe movement within a step', () => {
    const d = addStepAfter(base, 0)
    expect(d.steps[1].arrows).toEqual([])
    expect(d.steps[1].annotations).toEqual([])
  })

  it('carries the ball forward', () => {
    const withBall = { ...base, steps: [{ ...base.steps[0], ball: { x: 4, y: 5 } }] }
    expect(addStepAfter(withBall, 0).steps[1].ball).toEqual({ x: 4, y: 5 })
  })

  it('copies players rather than sharing them, so moving one does not move both', () => {
    const d = addStepAfter(base, 0)
    d.steps[1].players[0].x = 999
    expect(d.steps[0].players[0].x).toBe(10)
  })

  it('inserts after the given index and renumbers', () => {
    const d = addStepAfter(addStepAfter(base, 0), 0)
    expect(d.steps.map((s) => s.name)).toEqual(['Step 1', 'Step 2', 'Step 3'])
  })
})

describe('duplicateStep', () => {
  it('copies the drawings too, with fresh ids', () => {
    const base = migrateDiagram({
      players: [player('o1', 1, 2)],
      arrows: [{ id: 'a1', from: 'o1', points: [1, 2, 3, 4], type: 'pass' }],
    })
    const d = duplicateStep(base, 0)
    expect(d.steps).toHaveLength(2)
    expect(d.steps[1].arrows).toHaveLength(1)
    expect(d.steps[1].arrows[0].id).not.toBe('a1')
    expect(d.steps[1].arrows[0].type).toBe('pass')
  })
})

describe('deleteStep', () => {
  it('removes the step and renumbers the rest', () => {
    const three = addStepAfter(addStepAfter(emptyDiagram(), 0), 1)
    const d = deleteStep(three, 1)
    expect(d.steps).toHaveLength(2)
    expect(d.steps.map((s) => s.name)).toEqual(['Step 1', 'Step 2'])
  })

  it('refuses to empty the sequence — a play with no steps cannot be edited back', () => {
    const one = emptyDiagram()
    expect(deleteStep(one, 0).steps).toHaveLength(1)
  })
})
