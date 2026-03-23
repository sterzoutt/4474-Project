// Mulberry32 seeded PRNG — deterministic, fast, good distribution
function createRng(seed) {
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

// Per-difficulty parameters
const DIFFICULTY = {
  // 'mini' guarantees start and target stay within 1-20 (ruler range)
  mini:   { pipeRange: [1, 6],   solutionCount: 2, totalPipes: 4,
            addStart: [1, 10],   subTarget: [1, 8], mixStart: [5, 13], maxVal: 20 },
  easy:   { pipeRange: [1, 12],  solutionCount: 2, totalPipes: 4, targetRange: [1, 20] },
  medium: { pipeRange: [2, 18],  solutionCount: 3, totalPipes: 5, targetRange: [1, 30] },
  hard:   { pipeRange: [3, 25],  solutionCount: 4, totalPipes: 6, targetRange: [1, 40] },
}

/**
 * Generate one solvable puzzle.
 * Strategy per mode:
 *  - addition:    target = start + sum(pipes)  — always valid
 *  - subtraction: start  = target + sum(pipes)  — always valid, start > target
 *  - mixed:       random ops, retry if target out of range
 */
function generatePuzzle(difficulty, mode, seed) {
  const cfg = DIFFICULTY[difficulty]
  const rng = createRng(seed)

  for (let attempt = 0; attempt < 30; attempt++) {
    const solutionPipes = Array.from(
      { length: cfg.solutionCount },
      () => randInt(rng, cfg.pipeRange[0], cfg.pipeRange[1])
    )

    let operators
    let start
    let target

    if (mode === 'addition') {
      operators = solutionPipes.map(() => '+')
      const aMin = cfg.addStart ? cfg.addStart[0] : 1
      const aMax = cfg.addStart ? cfg.addStart[1] : 15
      start  = randInt(rng, aMin, aMax)
      target = solutionPipes.reduce((acc, v) => acc + v, start)
    } else if (mode === 'subtraction') {
      operators = solutionPipes.map(() => '-')
      const sMin = cfg.subTarget ? cfg.subTarget[0] : (cfg.targetRange ? cfg.targetRange[0] : 1)
      const sMax = cfg.subTarget ? cfg.subTarget[1] : Math.min(cfg.targetRange ? cfg.targetRange[1] : 20, 20)
      target = randInt(rng, sMin, sMax)
      start  = solutionPipes.reduce((acc, v) => acc + v, target)
    } else {
      // mixed — at least one of each sign
      operators = solutionPipes.map((_, i) =>
        i === 0 ? '+' : i === 1 ? '-' : rng() > 0.5 ? '+' : '-'
      )
      const mMin = cfg.mixStart ? cfg.mixStart[0] : 5
      const mMax = cfg.mixStart ? cfg.mixStart[1] : 25
      start  = randInt(rng, mMin, mMax)
      target = solutionPipes.reduce(
        (acc, v, i) => acc + (operators[i] === '+' ? v : -v),
        start
      )
    }

    // Reject degenerate puzzles
    if (target <= 0 || target > 60 || target === start) continue
    // Reject if any value exceeds the difficulty's max allowed value
    if (cfg.maxVal && (start > cfg.maxVal || target > cfg.maxVal)) continue

    // Build unique distractor pipes
    const usedSet = new Set(solutionPipes)
    const distractors = []
    let tries = 0
    while (distractors.length < cfg.totalPipes - cfg.solutionCount && tries < 60) {
      const v = randInt(rng, cfg.pipeRange[0], cfg.pipeRange[1])
      if (!usedSet.has(v)) { distractors.push(v); usedSet.add(v) }
      tries++
    }
    // Pad if needed
    while (distractors.length < cfg.totalPipes - cfg.solutionCount) {
      distractors.push(randInt(rng, cfg.pipeRange[0], cfg.pipeRange[1]))
    }

    const allPipes = shuffleArr([...solutionPipes, ...distractors], rng)

    return {
      id: seed,
      start,
      target,
      pipes: allPipes,
      slotCount: cfg.solutionCount,
      // Prefixed with _ — used internally for hints only
      _solution: solutionPipes.map((val, i) => ({ val, op: operators[i] })),
    }
  }

  // If all attempts fail, nudge the seed and retry
  return generatePuzzle(difficulty, mode, seed + 7)
}

/**
 * Get the nth puzzle for a given difficulty + mode.
 * Deterministic: same inputs always return the same puzzle.
 */
export function getPuzzle(difficulty, mode, index) {
  const modeSeed  = { addition: 0, subtraction: 5000, mixed: 10000 }[mode]  ?? 0
  const diffSeed  = { easy: 0, medium: 2000, hard: 4000 }[difficulty] ?? 0
  return generatePuzzle(difficulty, mode, modeSeed + diffSeed + index * 17 + 1)
}
