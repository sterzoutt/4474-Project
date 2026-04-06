/**
 * Live equation formatting, prefix bounds, and solvability checks for pipe placement.
 */
import { evaluate } from './evaluator'

const RULER_MIN = 1
const RULER_MAX = 20

/** Permutations of k items chosen from arr (order matters), arr elements are distinct indices */
function permutationsOfPipeIndices(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const out = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutationsOfPipeIndices(rest, k - 1)) {
      out.push([arr[i], ...p])
    }
  }
  return out
}

/**
 * Sequential evaluation: apply operators only for contiguous filled slots from index 0
 * (matches gameplay: fill slot 0, then 1, …).
 */
export function evaluateSequential(start, slotVals, operators) {
  let result = start
  for (let i = 0; i < slotVals.length; i++) {
    if (slotVals[i] === null || slotVals[i] === undefined) break
    result += operators[i] === '+' ? slotVals[i] : -slotVals[i]
  }
  return result
}

/** Human-readable expression for filled prefix only, e.g. "3 + 5 − 2" */
export function formatLiveEquationString(start, slotVals, operators) {
  let s = String(start)
  for (let i = 0; i < slotVals.length; i++) {
    if (slotVals[i] === null) break
    const op = operators[i] === '-' ? '−' : '+'
    s += ` ${op} ${slotVals[i]}`
  }
  return s
}

/**
 * After each applied term, running value must stay on the ruler (mini difficulty).
 */
export function prefixWithinRuler(start, slotVals, operators) {
  let result = start
  if (result < RULER_MIN || result > RULER_MAX) return false
  for (let i = 0; i < slotVals.length; i++) {
    if (slotVals[i] === null) break
    result += operators[i] === '+' ? slotVals[i] : -slotVals[i]
    if (result < RULER_MIN || result > RULER_MAX) return false
  }
  return true
}

/**
 * True if some assignment of remaining tray pipes to empty slots (+ optional mixed ops)
 * can equal the target, with every prefix on the ruler (1–20).
 *
 * Tray often has MORE pipes than empty slots (distractors): we pick one pipe per empty
 * slot from the unused pool — do not require |available| === |empty|.
 */
export function canReachTarget(puzzle, slotsState, operators, mode) {
  const slotCount = puzzle.slotCount
  const slotVals = slotsState.map((s) => (s ? s.value : null))
  const usedPipeIdx = new Set(slotsState.filter(Boolean).map((s) => s.pipeIdx))
  const available = puzzle.pipes.map((_, i) => i).filter((i) => !usedPipeIdx.has(i))
  const emptyIdx = []
  for (let i = 0; i < slotCount; i++) {
    if (slotVals[i] === null) emptyIdx.push(i)
  }

  if (available.length < emptyIdx.length) return false

  if (emptyIdx.length === 0) {
    if (mode === 'mixed') {
      for (let mask = 0; mask < 1 << slotCount; mask++) {
        const testOps = Array.from({ length: slotCount }, (_, j) =>
          (mask >> j) & 1 ? '-' : '+'
        )
        if (
          prefixWithinRuler(puzzle.start, slotVals, testOps) &&
          evaluate(puzzle.start, slotVals, testOps) === puzzle.target
        ) return true
      }
      return false
    }
    if (!prefixWithinRuler(puzzle.start, slotVals, operators)) return false
    return evaluate(puzzle.start, slotVals, operators) === puzzle.target
  }

  const perms = permutationsOfPipeIndices(available, emptyIdx.length)

  for (const perm of perms) {
    const testVals = [...slotVals]
    emptyIdx.forEach((slotIx, j) => {
      testVals[slotIx] = puzzle.pipes[perm[j]]
    })

    if (mode === 'mixed') {
      for (let mask = 0; mask < 1 << slotCount; mask++) {
        const testOps = Array.from({ length: slotCount }, (_, j) =>
          (mask >> j) & 1 ? '-' : '+'
        )
        if (
          prefixWithinRuler(puzzle.start, testVals, testOps) &&
          evaluate(puzzle.start, testVals, testOps) === puzzle.target
        ) {
          return true
        }
      }
    } else if (
      prefixWithinRuler(puzzle.start, testVals, operators) &&
      evaluate(puzzle.start, testVals, operators) === puzzle.target
    ) {
      return true
    }
  }

  return false
}

/**
 * Validate a tentative placement at `slotIndex` with `pipeIdx`.
 * Returns { ok, reason? }.
 */
export function validatePlacement(puzzle, slotsState, operators, mode, slotIndex, pipeIdx) {
  const next = [...slotsState]
  next[slotIndex] = { pipeIdx, value: puzzle.pipes[pipeIdx] }
  const slotVals = next.map((s) => (s ? s.value : null))

  if (mode !== 'mixed' && !prefixWithinRuler(puzzle.start, slotVals, operators)) {
    return { ok: false, reason: 'ruler' }
  }
  if (!canReachTarget(puzzle, next, operators, mode)) {
    return { ok: false, reason: 'unsolvable' }
  }
  return { ok: true }
}
