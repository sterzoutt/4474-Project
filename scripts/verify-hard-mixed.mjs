/**
 * Regression: Hard tier + mixed mode must resolve without throwing.
 * Run: node scripts/verify-hard-mixed.mjs
 *
 * Uses procedural generation only (same path as Hard in-game; no Vite CSV imports).
 */
import { generatePuzzle } from '../src/mathpipes/proceduralPuzzle.js'

const SESSION_QUESTIONS = 8
const mode = 'mixed'
const modeSeed = 10000
const diffSeed = 4000

function findPuzzleForQuestionIndex(index) {
  const baseSeed = (modeSeed + diffSeed + index * 17 + 1) >>> 0
  const tierRounds = 768
  for (let round = 0; round < tierRounds; round++) {
    const seed = (baseSeed + round * 7919) >>> 0
    const p = generatePuzzle('hard', mode, seed)
    if (p) return p
  }
  for (let round = tierRounds; round < tierRounds + 512; round++) {
    const seed = (baseSeed + round * 11003) >>> 0
    const p = generatePuzzle('hard', mode, seed)
    if (p) return p
  }
  return null
}

let failed = false
for (let q = 0; q < SESSION_QUESTIONS; q++) {
  const p = findPuzzleForQuestionIndex(q)
  if (!p || p.slotCount !== 3 || p.pipes.length !== 7) {
    console.error(`verify-hard-mixed: fail at question index ${q}`, p)
    failed = true
    break
  }
}

if (failed) {
  process.exit(1)
}
console.log(`verify-hard-mixed: ok (${SESSION_QUESTIONS} questions)`)
