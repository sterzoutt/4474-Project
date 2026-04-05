/**
 * CSV question format for the shipped “mini” game (2 slots, 4 pipes, ruler 1–20).
 *
 * Header (required first non-comment line):
 *   id,start,target,p1,p2,p3,p4,op1,op2,s0,s1
 *
 * - start, target: integers 1–20 (pipe ruler bounds).
 * - p1–p4: tray pipe values, left-to-right order in the UI (four distinct integers).
 * - op1, op2: slot operators, each "+" or "-" (addition rows: both "+"; subtraction: both "-";
 *   mixed: one "+" and one "-" — matches mixed-mode UX in the shipped game).
 * - s0, s1: correct pipe values for slot 0 and slot 1 in order (must be drawable from p1–p4;
 *   with operators must reach target with every prefix on 1–20).
 *
 * Lines starting with # are comments; empty lines are skipped.
 */

import { validatePuzzle } from './puzzleSolver.js'

const HEADER =
  'id,start,target,p1,p2,p3,p4,op1,op2,s0,s1'

function splitCsvLine(line) {
  return line.split(',').map((p) => p.trim())
}

function normOp(c) {
  if (c === '+' || c === '-') return c
  return null
}

function multiset(arr) {
  const m = new Map()
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1)
  return m
}

/**
 * @param {string} csvText
 * @param {'addition'|'subtraction'|'mixed'} mode
 * @returns {{ puzzles: object[], errors: string[] }}
 */
export function parseQuestionCsv(csvText, mode) {
  const puzzles = []
  const errors = []
  const lines = csvText.split(/\r?\n/)

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim()
    if (!line || line.startsWith('#')) continue
    const cells = splitCsvLine(line)
    if (cells.join(',').toLowerCase() === HEADER) continue
    if (cells[0].toLowerCase() === 'id') continue

    if (cells.length !== 11) {
      errors.push(`Line ${li + 1}: expected 11 columns, got ${cells.length}`)
      continue
    }

    const id = cells[0]
    const startN = parseInt(cells[1], 10)
    const targetN = parseInt(cells[2], 10)
    const q1 = parseInt(cells[3], 10)
    const q2 = parseInt(cells[4], 10)
    const q3 = parseInt(cells[5], 10)
    const q4 = parseInt(cells[6], 10)
    const o1 = normOp(cells[7])
    const o2 = normOp(cells[8])
    const sv0 = parseInt(cells[9], 10)
    const sv1 = parseInt(cells[10], 10)

    if ([startN, targetN, q1, q2, q3, q4, sv0, sv1].some((n) => Number.isNaN(n))) {
      errors.push(`Line ${li + 1}: bad number`)
      continue
    }
    if (!o1 || !o2) {
      errors.push(`Line ${li + 1}: op1/op2 must be + or -`)
      continue
    }

    if (mode === 'addition' && (o1 !== '+' || o2 !== '+')) {
      errors.push(`Line ${li + 1}: addition mode requires +,+`)
      continue
    }
    if (mode === 'subtraction' && (o1 !== '-' || o2 !== '-')) {
      errors.push(`Line ${li + 1}: subtraction mode requires -,-`)
      continue
    }
    if (mode === 'mixed' && o1 === o2) {
      errors.push(`Line ${li + 1}: mixed mode requires one + and one -`)
      continue
    }

    const pipes = [q1, q2, q3, q4]
    if (new Set(pipes).size !== 4) {
      errors.push(
        `Line ${li + 1}: p1–p4 must be four distinct values (hints assume unique tray values)`
      )
      continue
    }

    const need = multiset([sv0, sv1])
    const have = multiset(pipes)
    let subsetOk = true
    for (const [k, v] of need) {
      if ((have.get(k) || 0) < v) subsetOk = false
    }
    if (!subsetOk) {
      errors.push(`Line ${li + 1}: s0,s1 must be chosen from p1–p4`)
      continue
    }

    const puzzle = {
      id: `csv-${mode}-${id}`,
      start: startN,
      target: targetN,
      pipes,
      slotCount: 2,
      defaultOperators: [o1, o2],
      _solution: [
        { val: sv0, op: o1 },
        { val: sv1, op: o2 },
      ],
    }

    const v = validatePuzzle(puzzle, mode)
    if (!v.ok) {
      errors.push(`Line ${li + 1}: validatePuzzle failed (${v.reason})`)
      continue
    }

    puzzles.push(puzzle)
  }

  return { puzzles, errors }
}
