/**
 * Regenerates all question CSV banks from procedural generation.
 * Run: node scripts/generate-csv-banks.mjs
 *
 * Produces one file per (tier × mode) combination:
 *   questions/addition.csv            — mini  (Easy):   2 slots, 4 pipes, numbers 1–6
 *   questions/subtraction.csv         — mini  (Easy):   2 slots, 4 pipes, numbers 1–6
 *   questions/mixed.csv               — mini  (Easy):   2 slots, 4 pipes, numbers 1–6
 *   questions/addition-normal.csv     — easy  (Normal): 2 slots, 4 pipes, numbers 1–8
 *   questions/subtraction-normal.csv  — easy  (Normal): 2 slots, 4 pipes, numbers 1–8
 *   questions/mixed-normal.csv        — easy  (Normal): 2 slots, 4 pipes, numbers 1–8
 *
 * Hard tier (3 slots, 7 pipes, 2–10) uses runtime procedural generation — no CSV needed.
 * Only includes puzzles whose tray has all-distinct pipe values (required by CSV loader).
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { generatePuzzle } from '../src/mathpipes/proceduralPuzzle.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'questions')
const TARGET_PER_MODE = 100

const HEADER =
  '# Pipe puzzles: 2 slots, 4 distinct tray pipes, start/target on 1–20 ruler.\n' +
  '# Schema: id,start,target,p1,p2,p3,p4,op1,op2,s0,s1\n' +
  'id,start,target,p1,p2,p3,p4,op1,op2,s0,s1\n'

function formatRow(id, p) {
  const [p1, p2, p3, p4] = p.pipes
  const [op1, op2] = p.defaultOperators
  const s0 = p._solution[0].val
  const s1 = p._solution[1].val
  return `${id},${p.start},${p.target},${p1},${p2},${p3},${p4},${op1},${op2},${s0},${s1}`
}

/**
 * @param {'mini'|'easy'} tier
 * @param {'addition'|'subtraction'|'mixed'} mode
 */
function collectBank(tier, mode) {
  // Different seed offsets per tier so mini and normal never produce the same puzzle
  const tierSeed = { mini: 0, easy: 20000 }[tier]
  const modeSeed = { addition: 0, subtraction: 5000, mixed: 10000 }[mode]
  const rows = []
  let attempt = 0
  const maxAttempts = 200000

  while (rows.length < TARGET_PER_MODE && attempt < maxAttempts) {
    const seed = tierSeed + modeSeed + attempt * 17 + 1
    const p = generatePuzzle(tier, mode, seed)
    attempt++
    if (!p) continue
    if (new Set(p.pipes).size !== p.pipes.length) continue
    rows.push(formatRow(rows.length + 1, p))
  }

  if (rows.length < TARGET_PER_MODE) {
    console.warn(
      `[generate-csv] only got ${rows.length}/${TARGET_PER_MODE} rows for ${tier}/${mode}`
    )
  }
  return rows
}

mkdirSync(OUT_DIR, { recursive: true })

const BANKS = [
  // Easy tier — curated mini questions
  { tier: 'mini', mode: 'addition',    file: 'addition.csv' },
  { tier: 'mini', mode: 'subtraction', file: 'subtraction.csv' },
  { tier: 'mini', mode: 'mixed',       file: 'mixed.csv' },
  // Normal tier — wider number range (1–8) but same 2-slot layout
  { tier: 'easy', mode: 'addition',    file: 'addition-normal.csv' },
  { tier: 'easy', mode: 'subtraction', file: 'subtraction-normal.csv' },
  { tier: 'easy', mode: 'mixed',       file: 'mixed-normal.csv' },
]

for (const { tier, mode, file } of BANKS) {
  const rows = collectBank(tier, mode)
  const path = join(OUT_DIR, file)
  writeFileSync(path, HEADER + rows.join('\n') + '\n', 'utf8')
  console.log(`Wrote ${path} (${rows.length} puzzles) [${tier}/${mode}]`)
}

console.log('Done.')
