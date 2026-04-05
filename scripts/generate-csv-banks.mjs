/**
 * Regenerates questions/addition.csv, subtraction.csv, mixed.csv from procedural
 * generation (same rules as proceduralPuzzle.js). Run: node scripts/generate-csv-banks.mjs
 *
 * Only includes puzzles whose tray has four distinct pipe values (required by CSV loader).
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { generatePuzzle } from '../src/mathpipes/proceduralPuzzle.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'questions')
const TARGET_PER_MODE = 100

const HEADER =
  '# Mini pipe puzzles: 2 slots, 4 distinct tray pipes, start/target on 1–20 ruler.\n' +
  '# Schema: id,start,target,p1,p2,p3,p4,op1,op2,s0,s1\n' +
  'id,start,target,p1,p2,p3,p4,op1,op2,s0,s1\n'

function formatRow(id, p) {
  const [p1, p2, p3, p4] = p.pipes
  const [op1, op2] = p.defaultOperators
  const s0 = p._solution[0].val
  const s1 = p._solution[1].val
  return `${id},${p.start},${p.target},${p1},${p2},${p3},${p4},${op1},${op2},${s0},${s1}`
}

function collectMode(mode) {
  const modeSeed = { addition: 0, subtraction: 5000, mixed: 10000 }[mode]
  const rows = []
  let attempt = 0
  const maxAttempts = 80000

  while (rows.length < TARGET_PER_MODE && attempt < maxAttempts) {
    const seed = modeSeed + attempt * 17 + 1
    const p = generatePuzzle('mini', mode, seed)
    attempt++
    if (!p || new Set(p.pipes).size !== p.pipes.length) continue
    rows.push(formatRow(rows.length + 1, p))
  }

  if (rows.length < TARGET_PER_MODE) {
    console.warn(
      `[generate-csv] only got ${rows.length} rows for ${mode} (wanted ${TARGET_PER_MODE})`
    )
  }
  return rows
}

mkdirSync(OUT_DIR, { recursive: true })

for (const mode of ['addition', 'subtraction', 'mixed']) {
  const rows = collectMode(mode)
  const path = join(OUT_DIR, `${mode}.csv`)
  writeFileSync(path, HEADER + rows.join('\n') + '\n', 'utf8')
  console.log(`Wrote ${path} (${rows.length} puzzles)`)
}

console.log('Done.')
