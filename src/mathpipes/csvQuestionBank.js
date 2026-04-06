/**
 * Loads validated puzzles from CSV banks.
 * One file per (tier × mode) combination, bundled by Vite as raw strings.
 *
 * Tiers with CSV banks:
 *   mini  — Easy difficulty:   2 slots, 4 pipes, numbers 1–6 (curated)
 *   easy  — Normal difficulty: 2 slots, 4 pipes, numbers 1–8 (wider range)
 *
 * Hard tier (3 slots, 7 pipes, 2–10) is generated procedurally at runtime —
 * no CSV bank needed since the procedural engine already validates per mode.
 */
import additionMiniCsv        from '../../questions/addition.csv?raw'
import subtractionMiniCsv     from '../../questions/subtraction.csv?raw'
import mixedMiniCsv           from '../../questions/mixed.csv?raw'
import additionNormalCsv      from '../../questions/addition-normal.csv?raw'
import subtractionNormalCsv   from '../../questions/subtraction-normal.csv?raw'
import mixedNormalCsv         from '../../questions/mixed-normal.csv?raw'
import { parseQuestionCsv } from './csvQuestionParse.js'

const DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV

function buildBank(mode, raw) {
  const { puzzles, errors } = parseQuestionCsv(raw, mode)
  if (errors.length && DEV) {
    console.warn(`[csvQuestionBank] ${mode} parse issues:`, errors)
  }
  return puzzles
}

/**
 * 2-D lookup: banks[tier][mode] → puzzle[]
 * Only tiers that have CSV files are listed here.
 */
const banks = {
  mini: {
    addition:    buildBank('addition',    additionMiniCsv),
    subtraction: buildBank('subtraction', subtractionMiniCsv),
    mixed:       buildBank('mixed',       mixedMiniCsv),
  },
  easy: {
    addition:    buildBank('addition',    additionNormalCsv),
    subtraction: buildBank('subtraction', subtractionNormalCsv),
    mixed:       buildBank('mixed',       mixedNormalCsv),
  },
}

function clonePuzzle(p) {
  return {
    ...p,
    pipes: [...p.pipes],
    defaultOperators: [...p.defaultOperators],
    _solution: p._solution.map((x) => ({ ...x })),
  }
}

/**
 * Returns the nth pre-curated puzzle for a given tier + mode, or null if
 * no CSV bank exists for that tier (falls back to procedural in puzzleGenerator).
 *
 * @param {'mini'|'easy'} tier
 * @param {'addition'|'subtraction'|'mixed'} mode
 * @param {number} index  0-based (wraps around the bank)
 */
export function getCsvPuzzle(tier, mode, index) {
  const tierBank = banks[tier]
  if (!tierBank) return null
  const list = tierBank[mode]
  if (!list || list.length === 0) return null
  const i = ((index % list.length) + list.length) % list.length
  return clonePuzzle(list[i])
}

/** Backwards-compat alias used by older callers. */
export function getCsvMiniPuzzle(mode, index) {
  return getCsvPuzzle('mini', mode, index)
}

export function getCsvBankStats() {
  return {
    mini: {
      addition:    banks.mini.addition.length,
      subtraction: banks.mini.subtraction.length,
      mixed:       banks.mini.mixed.length,
    },
    easy: {
      addition:    banks.easy.addition.length,
      subtraction: banks.easy.subtraction.length,
      mixed:       banks.easy.mixed.length,
    },
  }
}
