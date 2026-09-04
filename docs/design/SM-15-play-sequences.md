# SM-15 — Play sequences and the ball token

**Status:** approved 2026-09-04. Implemented in #39.
**Depends on:** #27 (arrows could not be drawn at all).

## Problem

A play is a single frozen frame. A coach can show where five players ended up,
but not that 3 comes off a screen, catches, and drives. Every play in the app
today is a final position with no account of how anyone got there.

There is also no ball. A pass is drawn as an arrow between two tokens, but
nothing on the court represents possession, so "who has it now" is never
stated.

## Authoring model

Decided with the user, in preference to two alternatives:

- **Chosen — drag and draw independently, per step.** Within a step the coach
  moves players and draws arrows exactly as the editor works today, then saves.
- Rejected: positions derived from arrow endpoints (every small adjustment
  becomes an arrow-drawing exercise).
- Rejected: arrows derived automatically from position deltas (elegant, but it
  cannot express a screen, and it takes away the freehand drawing the coach
  already has).

The cost of the chosen model is that a step's arrows and its positions can in
principle disagree. That is accepted: the arrows are the coach's own notation,
and coaches already draw boards this way.

## Data model

Frontend-only. The backend stores `diagram_json` as opaque JSONB
(`json.RawMessage` in `models/playbook.go`) and never parses it, so there is no
migration and no Go change.

```ts
interface DiagramJSON {
  background: 'halfcourt' | 'fullcourt'
  steps: DiagramStep[]
}

interface DiagramStep {
  id: string
  name: string                 // "Step 1", renameable later
  players: PlayerToken[]       // where everyone stands in THIS step
  arrows: Arrow[]              // what happens DURING this step
  annotations: Annotation[]
  ball: BallToken | null       // one per step
}

interface BallToken { x: number; y: number }
```

`background` stays at the top level: a play does not change court halfway
through.

## Migration

Every play saved before this change has a flat
`{ background, players, arrows, annotations }`. On load these are wrapped as
`steps[0]`, so an existing play opens as a one-step sequence with everything
intact.

This is the riskiest code in the feature — it runs against every play a coach
has ever saved, and getting it wrong destroys their work the first time they
open it. It is a pure function with unit tests covering: a legacy diagram, an
already-migrated diagram, `null`, an empty object, and a diagram with a `steps`
key that is not a usable array.

## Adding a step

`+ Add step` copies the current step's **player and ball positions** forward and
**clears arrows and annotations**. The coach starts from where everyone ended
up and draws what happens next. Arrows describe movement *within* a step, so
carrying them forward would assert that the same movement happens twice.

## Ghosts

The previous step's players render behind the current step's, dimmed and
unlabelled. This is what makes a step read as *what changed* rather than as an
unrelated diagram. Ghosts are never interactive.

## Step bar

Under the toolbar: `‹ Step 2 / 4 ›`, plus `+ Add step`, `Duplicate` and
`Delete step` for coaches. A player viewing read-only gets only the arrows to
step through.

## Ball

`+ Ball` places one ball on the current step. It drags like a player and is
selected and deleted the same way. One per step; the button is hidden when the
current step already has one.

## Out of scope

- Animated playback between steps. Step-through first; the data model supports
  tweening later without changing shape.
- Naming steps in the UI. The field exists and is populated (`Step 1`); an
  editor for it is not worth the space yet.
- Deriving a pass from ball movement. The coach draws the pass arrow.
