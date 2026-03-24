/**
 * pipeTypes.js — pipe piece data model for the plumbing puzzle game.
 *
 * Every pipe is horizontal with exactly two curved ends:
 *   - "left-up"  variant: left end faces up,  right end faces down
 *   - "right-up" variant: right end faces up, left end faces down
 *
 * Pipes stack top-to-bottom, one per row. A pipe's upSide connects to the
 * pipe in the row above; its downSide connects to the pipe in the row below.
 */

export const PIPE_VARIANTS = {
  'left-up':  { upSide: 'left',  downSide: 'right' },
  'right-up': { upSide: 'right', downSide: 'left'  },
}

/**
 * Create a pipe piece object.
 * @param {string} id         - Unique identifier
 * @param {number} value      - Number this pipe represents in the equation
 * @param {'left-up'|'right-up'} variant
 * @param {number|null} rowIndex - Row the pipe occupies (null if not yet placed)
 * @returns {{ id, value, variant, upSide, downSide, rowIndex }}
 */
export function createPipe(id, value, variant, rowIndex = null) {
  const { upSide, downSide } = PIPE_VARIANTS[variant]
  return { id, value, variant, upSide, downSide, rowIndex }
}

/**
 * Returns true if pipeAbove and pipeBelow are physically connectable:
 * their touching ends must match AND pipeBelow must be exactly one row below.
 */
export function canConnect(pipeAbove, pipeBelow) {
  return (
    pipeAbove.downSide === pipeBelow.upSide &&
    pipeBelow.rowIndex === pipeAbove.rowIndex + 1
  )
}

/**
 * Returns true if a pipe already occupies the given row.
 */
export function isRowOccupied(placedPipes, rowIndex) {
  return placedPipes.some(p => p.rowIndex === rowIndex)
}

/**
 * Returns the index of the next empty row the player should place into.
 * If no pipes have been placed yet, returns 0.
 */
export function getActiveRow(placedPipes) {
  if (placedPipes.length === 0) return 0
  return Math.max(...placedPipes.map(p => p.rowIndex)) + 1
}

/**
 * Returns true if every pipe in placedPipes forms a valid connected chain
 * from top to bottom (each pipe's downSide matches the next pipe's upSide,
 * and row indices are consecutive with no gaps).
 */
export function isValidChain(placedPipes) {
  if (placedPipes.length === 0) return true
  const sorted = [...placedPipes].sort((a, b) => a.rowIndex - b.rowIndex)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (!canConnect(sorted[i], sorted[i + 1])) return false
  }
  return true
}

/**
 * Sample puzzle: start=6, target=11, addition.
 * Values: 6+2+1+2 = 11.
 * Variants alternate so every downSide matches the next pipe's upSide.
 *
 *  pipe-0  left-up   upSide=left  downSide=right  row 0
 *  pipe-1  right-up  upSide=right downSide=left   row 1  ← right matches right ✓
 *  pipe-2  left-up   upSide=left  downSide=right  row 2  ← left  matches left  ✓
 *  pipe-3  right-up  upSide=right downSide=left   row 3  ← right matches right ✓
 */
export const SAMPLE_PUZZLE = [
  createPipe('pipe-0', 6, 'left-up',  0),
  createPipe('pipe-1', 2, 'right-up', 1),
  createPipe('pipe-2', 1, 'left-up',  2),
  createPipe('pipe-3', 2, 'right-up', 3),
]
