/**
 * Procedural puzzle generation (seeded). Used as fallback when CSV banks
 * are empty or a row is missing, and by scripts/generate-csv-banks.mjs.
 */
import { validatePuzzle, ratePuzzleDifficulty } from './puzzleSolver.js'

export function createRng(seed) {
  let s = (seed >>> 0) || 1
  return () => {
    s += 0x6d2b79f5
    let z = s
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000
  }
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function shuffleArr(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV

function devLog(msg, data) {
  if (DEV) console.log(`[puzzle-gen] ${msg}`, data)
}

function devReject(reason, detail) {
  if (DEV) console.warn(`[puzzle-gen] rejected: ${reason}`, detail)
}

/**
 * Tier params — 'mini' matches the shipped game (2 slots, 4 pipes, ruler 1–20).
 */
export const DIFFICULTY = {
  mini: {
    slotCount: 2,
    totalPipes: 4,
    pipeRange: [1, 6],
    innerAttempts: 80,
  },
  easy: {
    slotCount: 2,
    totalPipes: 4,
    pipeRange: [1, 8],
    innerAttempts: 80,
  },
  medium: {
    slotCount: 3,
    totalPipes: 6,
    pipeRange: [1, 9],
    innerAttempts: 100,
  },
  hard: {
    slotCount: 3,
    totalPipes: 7,
    pipeRange: [2, 10],
    innerAttempts: 120,
  },
}

function genAddition(slotCount, pipeRange, rng) {
  const [lo, hi] = pipeRange
  const values = []
  let running = randInt(rng, 2, 14)
  const start = running
  for (let i = 0; i < slotCount; i++) {
    const maxV = Math.min(hi, 20 - running)
    if (maxV < lo) return null
    const v = randInt(rng, lo, maxV)
    values.push(v)
    running += v
  }
  const target = running
  if (start < 1 || start > 20 || target < 1 || target > 20) return null
  return { start, target, values, ops: values.map(() => '+') }
}

function genSubtraction(slotCount, pipeRange, rng) {
  const [lo, hi] = pipeRange
  const values = []
  let running = randInt(rng, Math.max(8, lo + 6), 20)
  const start = running
  for (let i = 0; i < slotCount; i++) {
    const maxV = Math.min(hi, running - 1)
    if (maxV < lo) return null
    const v = randInt(rng, lo, maxV)
    values.push(v)
    running -= v
  }
  const target = running
  if (target < 1 || target > 20 || start > 20) return null
  return { start, target, values, ops: values.map(() => '-') }
}

function genMixed(slotCount, pipeRange, rng) {
  const [lo, hi] = pipeRange
  for (let t = 0; t < 120; t++) {
    const ops = []
    let plus = 0
    let minus = 0
    for (let i = 0; i < slotCount; i++) {
      const op = rng() > 0.5 ? '+' : '-'
      ops.push(op)
      if (op === '+') plus++
      else minus++
    }
    if (slotCount >= 2 && (plus === 0 || minus === 0)) continue

    let running = randInt(rng, 3, 17)
    const start = running
    const values = []
    let bad = false
    for (let i = 0; i < slotCount; i++) {
      let maxV
      if (ops[i] === '+') {
        maxV = Math.min(hi, 20 - running)
      } else {
        maxV = Math.min(hi, running - 1)
      }
      if (maxV < lo) {
        bad = true
        break
      }
      const v = randInt(rng, lo, maxV)
      values.push(v)
      running = ops[i] === '+' ? running + v : running - v
      if (running < 1 || running > 20) {
        bad = true
        break
      }
    }
    if (bad) continue
    const target = running
    if (target >= 1 && target <= 20 && start >= 1 && start <= 20) {
      return { start, target, values, ops }
    }
  }
  return null
}

function buildSolution(mode, slotCount, pipeRange, rng) {
  if (mode === 'addition') return genAddition(slotCount, pipeRange, rng)
  if (mode === 'subtraction') return genSubtraction(slotCount, pipeRange, rng)
  return genMixed(slotCount, pipeRange, rng)
}

const RULER_MIN = 1
const RULER_MAX = 20

/**
 * Pipe values that must not appear as extra tray copies (distractors) or the
 * puzzle is rejected as misleading — see hasMisleadingDistractor in puzzleSolver.
 */
function misleadingPipeValues(start, target, mode) {
  const s = new Set()
  if (mode === 'addition' || mode === 'mixed') {
    const v = target - start
    if (v >= RULER_MIN && v <= RULER_MAX) s.add(v)
  }
  if (mode === 'subtraction' || mode === 'mixed') {
    const v = start - target
    if (v >= RULER_MIN && v <= RULER_MAX) s.add(v)
  }
  return s
}

function generateDistractorValues(solutionValues, count, pipeRange, rng, start, target, mode) {
  const [lo, hi] = pipeRange
  const misleading = misleadingPipeValues(start, target, mode)
  const pool = []
  for (let v = lo; v <= hi; v++) {
    if (!misleading.has(v)) pool.push(v)
  }
  if (pool.length === 0) {
    for (let v = lo; v <= hi; v++) pool.push(v)
  }
  const out = []
  let guard = 0
  while (out.length < count && guard < 500) {
    guard++
    const v = pool[Math.floor(rng() * pool.length)]
    out.push(v)
  }
  while (out.length < count) {
    out.push(pool[Math.floor(rng() * pool.length)] ?? lo)
  }
  return out
}

function assemblePuzzle(seed, mode, tierCfg, solution, rng) {
  const { slotCount, totalPipes } = tierCfg
  const distractorCount = totalPipes - slotCount
  const solutionValues = solution.values
  const solutionOps = solution.ops

  for (let dTry = 0; dTry < 40; dTry++) {
    const distractors = generateDistractorValues(
      solutionValues,
      distractorCount,
      tierCfg.pipeRange,
      rng,
      solution.start,
      solution.target,
      mode
    )
    const pipes = shuffleArr([...solutionValues, ...distractors], rng)

    const puzzle = {
      id: seed,
      start: solution.start,
      target: solution.target,
      pipes,
      slotCount,
      defaultOperators: [...solutionOps],
      _solution: solutionValues.map((val, i) => ({ val, op: solutionOps[i] })),
    }

    const v = validatePuzzle(puzzle, mode)
    if (v.ok) {
      devLog('accepted', {
        seed,
        mode,
        start: puzzle.start,
        target: puzzle.target,
        pipes: puzzle.pipes,
        solution: puzzle._solution,
        difficultyEstimate: ratePuzzleDifficulty(puzzle, mode),
      })
      return puzzle
    }
    devReject(v.reason, {
      seed,
      solutionCount: v.solutionCount,
      distinctAnswers: v.distinctAnswers,
    })
  }
  return null
}

/**
 * @param {string} difficulty
 * @param {'addition'|'subtraction'|'mixed'} mode
 * @param {number} seed
 */
export function generatePuzzle(difficulty, mode, seed) {
  const tierKey = DIFFICULTY[difficulty] ? difficulty : 'mini'
  const tierCfg = DIFFICULTY[tierKey]
  /**
   * Outer loop: each iteration tries one RNG stream. If a seed is "unlucky", fail
   * fast and let getPuzzle() try the next base seed — better than one multi‑second
   * monolithic attempt that blocks the UI.
   */
  const globalMax = tierKey === 'hard' ? 36 : 120

  for (let global = 0; global < globalMax; global++) {
    const s = seed + global * 29
    const r = createRng(s)
    let solution = null
    for (let inner = 0; inner < tierCfg.innerAttempts; inner++) {
      solution = buildSolution(mode, tierCfg.slotCount, tierCfg.pipeRange, r)
      if (solution) break
    }
    if (!solution) {
      devReject('no-solution-candidate', { difficulty, mode, seed: s })
      continue
    }

    const assembled = assemblePuzzle(s, mode, tierCfg, solution, r)
    if (assembled) return assembled
  }

  return null
}
