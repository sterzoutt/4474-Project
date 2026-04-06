/**
 * Puzzle entry: CSV-backed banks for the shipped mini tier; procedural fallback.
 */
import { generatePuzzle, DIFFICULTY } from './proceduralPuzzle.js'
import { getCsvPuzzle, getCsvMiniPuzzle, getCsvBankStats } from './csvQuestionBank.js'

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
  const seed = modeSeed + diffSeed + index * 17 + 1
  let p = generatePuzzle(difficulty, mode, seed)
  if (p) return p
  p = generatePuzzle('mini', mode, seed ^ 0x9e3779b9)
  if (p) return p
  p = generatePuzzle('mini', mode, (seed + 1337) >>> 0)
  if (p) return p
  throw new Error(`[puzzle-gen] exhausted retries for ${difficulty}/${mode}`)
}

export {
  validatePuzzle,
  countSolutions,
  ratePuzzleDifficulty,
  findSolutions,
} from './puzzleSolver.js'
