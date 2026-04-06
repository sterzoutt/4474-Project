/**
 * Backend-only: enumerate solutions and validate generated puzzles.
 * Matches gameplay rules (1–20 ruler on every prefix, sequential slots).
 */
import { evaluate } from './evaluator.js'

const RULER_MIN = 1
const RULER_MAX = 20

export function permutationsOfPipeIndices(arr, k) {
    if (k === 0) return [
        []
    ]
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

export function prefixValidSequential(start, slotVals, operators, min = RULER_MIN, max = RULER_MAX) {
    let result = start
    if (result < min || result > max) return false
    for (let i = 0; i < slotVals.length; i++) {
        result += operators[i] === '+' ? slotVals[i] : -slotVals[i]
        if (result < min || result > max) return false
    }
    return true
}

function answerKeyForSolution(s, puzzle, mode) {
    const vals = s.pipeIndices.map((i) => puzzle.pipes[i]).sort((a, b) => a - b)
    const valKey = vals.join(',')
    if (mode === 'mixed') {
        return `${valKey}|${s.operators.join('')}`
    }
    return valKey
}

/**
 * @param {{ stopWhenAmbiguous?: boolean }} [options]
 *        If `stopWhenAmbiguous` and mode is `mixed`, stop once two distinct answer
 *        keys are found (speeds up rejecting ambiguous candidates during generation).
 */
export function findSolutions(puzzle, mode, options) {
    const stopWhenAmbiguous = options?.stopWhenAmbiguous === true
    const { start, target, pipes, slotCount } = puzzle
    const n = pipes.length
    const idxs = Array.from({ length: n }, (_, i) => i)
    const perms = permutationsOfPipeIndices(idxs, slotCount)
    const solutions = []
    const distinctKeys = mode === 'mixed' ? new Set() : null

    for (const perm of perms) {
        const vals = perm.map((i) => pipes[i])
        if (mode === 'mixed') {
            for (let mask = 0; mask < 1 << slotCount; mask++) {
                const ops = Array.from({ length: slotCount }, (_, i) =>
                    (mask >> i) & 1 ? '-' : '+'
                )
                if (!prefixValidSequential(start, vals, ops)) continue
                if (evaluate(start, vals, ops) === target) {
                    const sol = { pipeIndices: [...perm], operators: ops }
                    solutions.push(sol)
                    distinctKeys.add(answerKeyForSolution(sol, puzzle, mode))
                    if (stopWhenAmbiguous && distinctKeys.size > 1) return solutions
                }
            }
        } else {
            const ops = Array(slotCount).fill(mode === 'subtraction' ? '-' : '+')
            if (!prefixValidSequential(start, vals, ops)) continue
            if (evaluate(start, vals, ops) === target) {
                solutions.push({ pipeIndices: [...perm], operators: ops })
            }
        }
    }
    return solutions
}

function countDistinctAnswerKeysFromSolutions(sols, puzzle, mode) {
    const keys = new Set()
    for (const s of sols) {
        const vals = s.pipeIndices.map((i) => puzzle.pipes[i]).sort((a, b) => a - b)
        const valKey = vals.join(',')
        if (mode === 'mixed') {
            keys.add(`${valKey}|${s.operators.join('')}`)
        } else {
            keys.add(valKey)
        }
    }
    return keys.size
}

export function countDistinctAnswerKeys(puzzle, mode) {
    return countDistinctAnswerKeysFromSolutions(findSolutions(puzzle, mode), puzzle, mode)
}

/**
 * Returns true if any DISTRACTOR pipe (not part of the solution) has a value
 * that would reach `target` from `start` in a single step.
 *
 * Example: start=9, target=1, subtraction, distractor=8 → 9-8=1 → misleading.
 * The player mentally solves it with one pipe even though two slots must be filled.
 */
export function hasMisleadingDistractor(puzzle, mode) {
  const { start, target, pipes } = puzzle

  let solVals
  if (Array.isArray(puzzle._solution) && puzzle._solution.length > 0) {
    solVals = puzzle._solution.map((s) => s.val)
  } else {
    const sols = findSolutions(puzzle, mode)
    if (sols.length === 0) return false
    solVals = sols[0].pipeIndices.map((i) => pipes[i])
  }

  const solCount = new Map()
  for (const v of solVals) solCount.set(v, (solCount.get(v) || 0) + 1)

  const misleadingVals = new Set()
  if (mode === 'addition' || mode === 'mixed') {
    const v = target - start
    if (v >= RULER_MIN && v <= RULER_MAX) misleadingVals.add(v)
  }
  if (mode === 'subtraction' || mode === 'mixed') {
    const v = start - target
    if (v >= RULER_MIN && v <= RULER_MAX) misleadingVals.add(v)
  }
  if (misleadingVals.size === 0) return false

  const remaining = new Map(solCount)
  for (const p of pipes) {
    const used = remaining.get(p) || 0
    if (used > 0) {
      remaining.set(p, used - 1)
      continue
    }
    if (misleadingVals.has(p)) return true
  }
  return false
}

export function validatePuzzle(puzzle, mode) {
    if (!puzzle || typeof puzzle.start !== 'number' || typeof puzzle.target !== 'number') {
        return { ok: false, reason: 'missing-fields' }
    }
    if (!Array.isArray(puzzle.pipes) || puzzle.pipes.length < puzzle.slotCount) {
        return { ok: false, reason: 'bad-pipes' }
    }
    const sc = puzzle.slotCount
    if (sc < 1 || sc > 6) return { ok: false, reason: 'bad-slot-count' }

    if (puzzle.start < RULER_MIN || puzzle.start > RULER_MAX) {
        return { ok: false, reason: 'start-out-of-range' }
    }
    if (puzzle.target < RULER_MIN || puzzle.target > RULER_MAX) {
        return { ok: false, reason: 'target-out-of-range' }
    }

    const sols = findSolutions(puzzle, mode, { stopWhenAmbiguous: true })
    const n = sols.length
    if (n === 0) return { ok: false, reason: 'unsolvable', solutionCount: 0 }

    const distinctAnswers = countDistinctAnswerKeysFromSolutions(sols, puzzle, mode)
    if (distinctAnswers > 1) {
        return { ok: false, reason: 'ambiguous-multiple-answers', solutionCount: n, distinctAnswers }
    }

    if (hasMisleadingDistractor(puzzle, mode)) {
        return { ok: false, reason: 'misleading-distractor' }
    }

    return { ok: true, reason: null, solutionCount: n, distinctAnswers: 1 }
}

export function countSolutions(puzzle, mode) {
    return findSolutions(puzzle, mode).length
}

export function ratePuzzleDifficulty(puzzle, mode) {
    const sc = puzzle.slotCount
    const nP = puzzle.pipes.length
    const distractors = nP - sc
    let score = 0.15 * (sc - 2) + 0.12 * distractors
    if (mode === 'mixed') score += 0.2
    return Math.min(1, score)
}