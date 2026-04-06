import { getPuzzle } from './puzzleGenerator'

export const SESSION_KEY = 'pipesGameSession'
export const GAME_MODE_STORAGE_KEY = 'gameMode'

const VERSION = 1
/** Questions per run — shown on mode select & session UI */
export const SESSION_QUESTION_COUNT = 8
const Q_MAX = SESSION_QUESTION_COUNT

function defaultOps(count, mode) {
  return Array(count).fill(mode === 'subtraction' ? '-' : '+')
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSession(snapshot) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore quota */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function packSessionForStorage(mode, fields) {
  return { v: VERSION, mode, ...fields }
}

/** True if a completed (sessionDone) save exists — used by the mode select screen. */
export function isSessionDone() {
  const s = loadSession()
  return !!(s && s.v === VERSION && s.sessionDone === true)
}

/**
 * True only if there is an IN-PROGRESS session that can be resumed.
 * Completed sessions (sessionDone: true) return false — they cannot be continued.
 */
export function isSessionLoadable() {
  const s = loadSession()
  if (!s || s.v !== VERSION) return false
  if (!['addition', 'subtraction', 'mixed'].includes(s.mode)) return false
  if (s.sessionDone) return false   // finished games cannot be "continued"
  const qn = Math.min(Math.max(1, Number(s.questionNum) || 1), Q_MAX)
  const puzzle = getPuzzle('mini', s.mode, qn - 1)
  if (!Array.isArray(s.slots) || s.slots.length !== puzzle.slotCount) return false
  return true
}

/**
 * One-time mount state for PipesGame (resume mid-puzzle or fresh session).
 */
export function buildInitialMountState(mode, initialSession) {
  const fresh = (questionNum = 1) => {
    const qn = Math.min(Math.max(1, questionNum), Q_MAX)
    const puzzle = getPuzzle('mini', mode, qn - 1)
    return {
      skipFirstPuzzleReset: false,
      questionNum: qn,
      score: 0,
      hintsTotal: 0,
      sessionDone: false,
      transPhase: null,
      slots: Array(puzzle.slotCount).fill(null),
      operators: defaultOps(puzzle.slotCount, mode),
      selIdx: null,
      gameState: 'playing',
      valveState: 'locked',
      hintPipeIdx: null,
      hintStep: 0,
      hintsUsed: 0,
      wrongMsg: '',
    }
  }

  if (!initialSession || initialSession.v !== VERSION || initialSession.mode !== mode) {
    return fresh(1)
  }

  const qn = Math.min(Math.max(1, Number(initialSession.questionNum) || 1), Q_MAX)
  const puzzle = getPuzzle('mini', mode, qn - 1)
  if (!Array.isArray(initialSession.slots) || initialSession.slots.length !== puzzle.slotCount) {
    return fresh(1)
  }

  let operators = initialSession.operators
  if (!Array.isArray(operators) || operators.length !== puzzle.slotCount) {
    operators = defaultOps(puzzle.slotCount, mode)
  } else {
    operators = operators.map((op) => (op === '-' ? '-' : '+'))
  }

  const rawSlots = initialSession.slots
  const slots = rawSlots.map((cell) => {
    if (!cell) return null
    if (typeof cell.pipeIdx !== 'number' || typeof cell.value !== 'number') return null
    const expected = puzzle.pipes[cell.pipeIdx]
    if (expected !== cell.value) return null
    return { pipeIdx: cell.pipeIdx, value: cell.value }
  })

  for (let i = 0; i < rawSlots.length; i++) {
    if (rawSlots[i] && !slots[i]) return fresh(qn)
  }

  const usedIdx = new Set()
  for (const s of slots) {
    if (!s) continue
    if (usedIdx.has(s.pipeIdx)) return fresh(qn)
    usedIdx.add(s.pipeIdx)
  }

  let snap = {
    skipFirstPuzzleReset: true,
    questionNum: qn,
    score: Math.max(0, Number(initialSession.score) || 0),
    hintsTotal: Math.max(0, Number(initialSession.hintsTotal) || 0),
    sessionDone: !!initialSession.sessionDone,
    transPhase:
      initialSession.transPhase === 'exit' || initialSession.transPhase === 'enter'
        ? initialSession.transPhase
        : null,
    slots,
    operators,
    selIdx: typeof initialSession.selIdx === 'number' ? initialSession.selIdx : null,
    gameState: ['playing', 'flowing', 'correct'].includes(initialSession.gameState)
      ? initialSession.gameState
      : 'playing',
    valveState: ['locked', 'ready', 'open', 'failed'].includes(initialSession.valveState)
      ? initialSession.valveState
      : 'locked',
    hintPipeIdx: typeof initialSession.hintPipeIdx === 'number' ? initialSession.hintPipeIdx : null,
    hintStep: Math.max(0, Number(initialSession.hintStep) || 0),
    hintsUsed: Math.max(0, Number(initialSession.hintsUsed) || 0),
    wrongMsg: typeof initialSession.wrongMsg === 'string' ? initialSession.wrongMsg : '',
  }

  if (!snap.sessionDone) {
    if (snap.gameState !== 'playing') {
      snap = { ...snap, gameState: 'playing', transPhase: null, valveState: 'locked' }
    } else if (snap.transPhase) {
      snap = { ...snap, transPhase: null, valveState: 'locked' }
    }
  }

  return snap
}
