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

export function findSolutions(puzzle, mode) {
    const { start, target, pipes, slotCount } = puzzle
    const n = pipes.length
    const idxs = Array.from({ length: n }, (_, i) => i)
    const perms = permutationsOfPipeIndices(idxs, slotCount)
    const solutions = []

    for (const perm of perms) {
        const vals = perm.map((i) => pipes[i])
        if (mode === 'mixed') {
            for (let mask = 0; mask < 1 << slotCount; mask++) {
                const ops = Array.from({ length: slotCount }, (_, i) =>
                    (mask >> i) & 1 ? '-' : '+'
                )
                if (!prefixValidSequential(start, vals, ops)) continue
                if (evaluate(start, vals, ops) === target) {
                    solutions.push({ pipeIndices: [...perm], operators: ops })
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

export function countDistinctAnswerKeys(puzzle, mode) {
    const sols = findSolutions(puzzle, mode)
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

    const n = findSolutions(puzzle, mode).length
    if (n === 0) return { ok: false, reason: 'unsolvable', solutionCount: 0 }

    const distinctAnswers = countDistinctAnswerKeys(puzzle, mode)
    if (distinctAnswers > 1) {
        return { ok: false, reason: 'ambiguous-multiple-answers', solutionCount: n, distinctAnswers }
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