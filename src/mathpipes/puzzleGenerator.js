/**
 * Puzzle entry: CSV-backed banks for the shipped mini tier; procedural fallback.
 */
import { generatePuzzle, DIFFICULTY } from './proceduralPuzzle.js'
import { getCsvPuzzle, getCsvBankStats } from './csvQuestionBank.js'

export { DIFFICULTY, generatePuzzle } from './proceduralPuzzle.js'
export { getCsvBankStats }

/**
 * Get the nth puzzle for a given difficulty tier + mode.
 * Deterministic: same inputs always return the same puzzle.
 *
 * CSV banks exist for 'mini' (Easy) and 'easy' (Normal) tiers.
 * 'hard' tier (3 slots, 7 pipes, 2–10) is always procedurally generated.
 */
export function getPuzzle(difficulty, mode, index) {
  const tierKey = DIFFICULTY[difficulty] ? difficulty : 'mini'

  // Use pre-curated CSV bank when one exists for this tier+mode combo.
  // 'hard' has no CSV bank so falls straight through to procedural generation.
  if (tierKey === 'mini' || tierKey === 'easy') {
    const csvP = getCsvPuzzle(tierKey, mode, index)
    if (csvP) return csvP
  }

  // Procedural fallback (always used for 'hard'; safety net for others)
  const modeSeed = { addition: 0, subtraction: 5000, mixed: 10000 }[mode] ?? 0
  const diffSeed = { easy: 0, medium: 2000, hard: 4000 }[difficulty] ?? 0
  const baseSeed = (modeSeed + diffSeed + index * 17 + 1) >>> 0

  const tryTier = (tier, seed) => generatePuzzle(tier, mode, seed >>> 0)

  // Many seed offsets — cheap per attempt after procedural/validation tuning.
  const tierRounds = tierKey === 'hard' ? 768 : 128
  for (let round = 0; round < tierRounds; round++) {
    const seed = (baseSeed + round * 7919) >>> 0
    const p = tryTier(tierKey, seed)
    if (p) return p
  }

  // Never downgrade tier: hard must stay 3-slot / 7-pipe layout (no mini fallback).
  if (tierKey !== 'hard') {
    let p = tryTier('mini', (baseSeed ^ 0x9e3779b9) >>> 0)
    if (p) return p
    p = tryTier('mini', (baseSeed + 1337) >>> 0)
    if (p) return p
  }

  for (let round = tierRounds; round < tierRounds + 512; round++) {
    const seed = (baseSeed + round * 11003) >>> 0
    const p = tryTier(tierKey, seed)
    if (p) return p
  }

  // Last resort: should be unreachable in practice; avoids crashing React render.
  console.error(`[puzzle-gen] exhausted retries for ${difficulty}/${mode}`)
  for (let round = 0; round < 8192; round++) {
    const seed = (baseSeed + round * 65537 + 0x13579bdf) >>> 0
    const p = tryTier(tierKey, seed)
    if (p) return p
  }
  throw new Error(`[puzzle-gen] exhausted retries for ${difficulty}/${mode}`)
}

export {
  validatePuzzle,
  countSolutions,
  ratePuzzleDifficulty,
  findSolutions,
} from './puzzleSolver.js'
