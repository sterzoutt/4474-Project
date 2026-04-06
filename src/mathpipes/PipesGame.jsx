import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react'
import { getPuzzle } from './puzzleGenerator'
import { isComplete } from './evaluator'
import { PIPE_VARIANTS }        from './pipeTypes'
import {
  evaluateSequential,
  validatePlacement,
} from './equationValidation'
import {
  buildInitialMountState,
  saveSession,
  packSessionForStorage,
  clearSession,
} from './pipesSession'
import './PipesGame.css'
import './PipePuzzleDesign.css'
import './PipeBoard.css'
import { useGameAudio } from '../audio/GameAudioProvider.jsx'
import HowToPlayModal from '../components/HowToPlayModal'
import { loadGameSettings } from '../audio/audioSettings.js'
import { loadKeyBindings } from '../audio/keyBindings.js'
import {
  loadProfile,
  recordPuzzleSolved,
  recordSessionComplete,
  getExpertiseTier,
} from '../audio/playerProfile.js'

const GAME_LENGTH = 8   // questions per session
const RULER_MAX   = 20  // fixed 1–20 ruler on both pipes

function defaultOps(count, mode) {
  return Array(count).fill(mode === 'subtraction' ? '-' : '+')
}

function puzzleOps(puzzle, mode) {
  if (Array.isArray(puzzle.defaultOperators) && puzzle.defaultOperators.length === puzzle.slotCount) {
    return [...puzzle.defaultOperators]
  }
  return defaultOps(puzzle.slotCount, mode)
}

// ── Pipe board SVG helpers (visual only — copied from PipeBoard.jsx) ─────────

const PIPE_D = {
  'left-up':  'M 50,0 L 50,18 Q 50,35 70,35 L 430,35 Q 450,35 450,52 L 450,70',
  'right-up': 'M 450,0 L 450,18 Q 450,35 430,35 L 70,35 Q 50,35 50,52 L 50,70',
}

const CONN_X = { left: 50, right: 450 }

function PipeSVG({ variant, value, kind, isFlowing, flowDelay }) {
  const d = PIPE_D[variant]
  // All pipes use the same grey structural gradient so the path reads as one
  // continuous system.  Start/end pipes get a slightly lighter variant so the
  // fixed values still stand out without breaking the grey colour scheme.
  const grad =
    kind === 'start' || kind === 'end'
      ? 'url(#pb-gFixedGrey)'
      : 'url(#pb-gPipe)'

  return (
    <svg viewBox="0 0 500 70" className="pb-svg">
      <path
        d={d} fill="none" stroke="rgba(0,0,0,0.5)"
        strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d={d} fill="none" stroke={grad}
        strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Water-flow overlay: animated stroke-dashoffset draws water along the pipe path */}
      {isFlowing && (
        <path
          d={d} fill="none" stroke="url(#pb-gWater)"
          strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"
          className="pb-water-path"
          style={flowDelay ? { animationDelay: flowDelay } : undefined}
        />
      )}
      <path
        d={d} fill="none" stroke="url(#pb-gShine)"
        strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
      />
      <text
        x="250" y="35"
        textAnchor="middle" dominantBaseline="central"
        className="pb-val"
      >
        {value}
      </text>
    </svg>
  )
}

function EmptySlotSVG({ expectedSide }) {
  const x = expectedSide ? CONN_X[expectedSide] : null

  return (
    <svg viewBox="0 0 500 70" className="pb-svg">
      <line
        x1="80" y1="35" x2="420" y2="35"
        stroke="rgba(74,158,222,0.25)" strokeWidth="2" strokeDasharray="10 6"
      />
      {x != null && (
        <>
          <line
            x1={x} y1="0" x2={x} y2="28"
            stroke="rgba(189,199,0,0.55)" strokeWidth="2.5" strokeDasharray="4 3"
          />
          <polygon
            points={`${x - 11},28 ${x + 11},28 ${x},10`}
            fill="#BDC700" opacity="0.8"
          />
        </>
      )}
      <text x="250" y="52" textAnchor="middle" className="pb-ph">?</text>
    </svg>
  )
}

function PBConnector({ side, isFlowing, flowDelay }) {
  if (!side) return <div className="pb-gap" />
  const x = CONN_X[side]
  return (
    <svg viewBox="0 0 500 10" className="pb-conn">
      <line
        x1={x} y1="0" x2={x} y2="10"
        stroke="rgba(255,255,255,0.22)" strokeWidth="5" strokeLinecap="round"
      />
      {isFlowing && (
        <line
          x1={x} y1="0" x2={x} y2="10"
          stroke="url(#pb-gWater)" strokeWidth="8" strokeLinecap="round"
          className="pb-water-conn"
          style={flowDelay ? { animationDelay: flowDelay } : undefined}
        />
      )}
    </svg>
  )
}

// ── 1–20 Measurement pipe ─────────────────────────────────────────────────────
// Shows every integer 1–20 as a tick mark with a label inside the pipe barrel.
// A coloured pin highlights the exact start / target position.
// A floating badge (above for START, below for TARGET) shows the value clearly.
function MeasurePipe({ markedVal, markerLabel, isStart, isFlowing, flowDelay }) {
  const clamped = Math.min(Math.max(markedVal, 1), RULER_MAX)
  const pct = (v) => `${(v / RULER_MAX) * 100}%`

  return (
    <div
      className={`pg-mpipe ${isStart ? 'pg-mpipe-top' : 'pg-mpipe-bot'}${isFlowing ? ' pg-flowing' : ''}`}
      style={flowDelay ? { animationDelay: flowDelay } : undefined}
    >
      {/* Floating badge ABOVE the barrel — START */}
      {isStart && (
        <div className="pg-mbw pg-mbw-above" style={{ left: pct(clamped) }}>
          <div className="pg-mbadge pg-mbadge-s">
            <span className="pg-mb-lbl">{markerLabel}</span>
            <span className="pg-mb-val">{markedVal}</span>
          </div>
          <div className="pg-mbarrow pg-mbarrow-dn" />
        </div>
      )}

      {/* Pipe barrel */}
      <div className="pg-barrel">
        {/* Left flange bolt */}
        <span className="pg-bbolt pg-bbolt-l" />

        {/* Tick marks: every integer 1–20 */}
        {Array.from({ length: RULER_MAX }, (_, i) => {
          const v      = i + 1
          const major  = v % 5 === 0
          const marked = v === clamped
          return (
            <div
              key={v}
              className={`pg-tick${major ? ' pg-tick-maj' : ' pg-tick-min'}${marked ? ' pg-tick-hi' : ''}`}
              style={{ left: pct(v) }}
            >
              <div className="pg-tline" />
              <span className="pg-tnum">{v}</span>
            </div>
          )
        })}

        {/* Solid coloured pin at the exact marked position */}
        <div
          className={`pg-pin ${isStart ? 'pg-pin-s' : 'pg-pin-t'}`}
          style={{ left: pct(clamped) }}
        />

        {/* Right flange bolt */}
        <span className="pg-bbolt pg-bbolt-r" />

        {/* Pipe shine */}
        <div className="pg-barrel-shine" />
      </div>

      {/* Floating badge BELOW the barrel — TARGET */}
      {!isStart && (
        <div className="pg-mbw pg-mbw-below" style={{ left: pct(clamped) }}>
          <div className="pg-mbarrow pg-mbarrow-up" />
          <div className="pg-mbadge pg-mbadge-t">
            <span className="pg-mb-lbl">{markerLabel}</span>
            <span className="pg-mb-val">{markedVal}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Valve SVG ─────────────────────────────────────────────────────────────────
function Valve({ state, onClick }) {
  const P = {
    locked: { rim: '#6b7280', fill: '#374151', spoke: '#4b5563', hub: '#9ca3af' },
    ready:  { rim: '#22c55e', fill: '#166534', spoke: '#16a34a', hub: '#86efac' },
    open:   { rim: '#38bdf8', fill: '#075985', spoke: '#0ea5e9', hub: '#7dd3fc' },
    failed: { rim: '#ef4444', fill: '#7f1d1d', spoke: '#dc2626', hub: '#fca5a5' },
  }[state] ?? { rim: '#6b7280', fill: '#374151', spoke: '#4b5563', hub: '#9ca3af' }

  return (
    <svg
      className={`pg-valve pg-valve-${state}`}
      width="72" height="72" viewBox="0 0 72 72"
      onClick={onClick} role="button" aria-label="Open valve"
    >
      <rect x="29" y="1"  width="14" height="18" rx="5"  fill={P.rim} />
      <circle cx="36" cy="36" r="30" fill={P.fill} stroke={P.rim} strokeWidth="5" />
      <line x1="36" y1="10" x2="36" y2="62" stroke={P.spoke} strokeWidth="5"  strokeLinecap="round" />
      <line x1="10" y1="36" x2="62" y2="36" stroke={P.spoke} strokeWidth="5"  strokeLinecap="round" />
      <line x1="15" y1="15" x2="57" y2="57" stroke={P.spoke} strokeWidth="3"  strokeLinecap="round" />
      <line x1="57" y1="15" x2="15" y2="57" stroke={P.spoke} strokeWidth="3"  strokeLinecap="round" />
      <circle cx="36" cy="36" r="9"  fill={P.hub}  stroke={P.rim} strokeWidth="2" />
      <ellipse cx="25" cy="23" rx="6" ry="4" fill="rgba(255,255,255,0.13)" />
    </svg>
  )
}

// ── Path slot ─────────────────────────────────────────────────────────────────
function PathSlot({ slot, operator, mode, isReady, isFlowing, isHinted, flowDelay, onSlotClick, onOpToggle }) {
  const filled = slot !== null
  const cls = [
    'pg-pslot',
    filled    ? 'pg-pslot-filled' : 'pg-pslot-empty',
    isReady   ? 'pg-pslot-ready'  : '',
    isFlowing ? 'pg-flowing'      : '',
    isHinted  ? 'pg-pslot-hint'   : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      style={isFlowing ? { animationDelay: flowDelay } : undefined}
      onClick={onSlotClick}
    >
      <span className="pg-flange" />
      <div className="pg-pslot-body">
        {filled ? (
          <>
            <button
              className={`pg-optag${mode === 'mixed' ? ' pg-optag-click' : ''}`}
              onClick={(e) => { e.stopPropagation(); onOpToggle() }}
              disabled={mode !== 'mixed'}
            >{operator}</button>
            <span className="pg-pslot-val">{slot.value}</span>
          </>
        ) : (
          <span className="pg-pslot-ph">?</span>
        )}
      </div>
      <span className="pg-flange" />
    </div>
  )
}

// ── Tray pipe piece ───────────────────────────────────────────────────────────
function TrayPipe({ value, state, onClick }) {
  return (
    <button
      className={`pg-tpipe pg-tpipe-${state || 'idle'}`}
      onClick={onClick}
      disabled={state === 'used'}
      aria-label={`Pipe ${value}`}
    >
      <span className="pg-tcap" />
      <span className="pg-tbody">{value}</span>
      <span className="pg-tcap" />
    </button>
  )
}

// ── Vertical pipe connector ───────────────────────────────────────────────────
function VConn({ flowing, delay }) {
  return (
    <div
      className={`pg-vconn${flowing ? ' pg-flowing' : ''}`}
      style={delay ? { animationDelay: delay } : undefined}
    />
  )
}

// ── Session-end overlay ───────────────────────────────────────────────────────
function EndScreen({ score, hintsTotal, onHome, onPlayAgain }) {
  return (
    <div className="pg-end-overlay">
      <div className="pg-end-card">
        <div className="pg-end-trophy">🏆</div>
        <h2 className="pg-end-title">Good Job!</h2>
        <p className="pg-end-sub">All {GAME_LENGTH} puzzles complete!</p>
        <div className="pg-end-stats">
          <div className="pg-end-stat">
            <span className="pg-end-stat-n">{score}</span>
            <span className="pg-end-stat-l">Points</span>
          </div>
          <div className="pg-end-stat">
            <span className="pg-end-stat-n">{hintsTotal}</span>
            <span className="pg-end-stat-l">Hints Used</span>
          </div>
        </div>
        {/* Play Again goes straight to mode select so user can pick a new game immediately */}
        <button className="pg-btn pg-btn-play-again" onClick={onPlayAgain}>
          ↺ Play Again
        </button>
        <button className="pg-btn pg-btn-home" onClick={onHome}>
          ← Main Menu
        </button>
      </div>
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────────
function PipesGame({ mode, onBack, onPlayAgain, initialSession = null, onAbandon }) {
  const { playSfx } = useGameAudio()
  const mountStateRef = useRef(null)
  if (mountStateRef.current === null) {
    mountStateRef.current = buildInitialMountState(mode, initialSession)
  }
  const M = mountStateRef.current

  const [questionNum,  setQuestionNum]  = useState(M.questionNum)
  const [score,        setScore]        = useState(M.score)
  const [hintsTotal,   setHintsTotal]   = useState(M.hintsTotal)
  const [sessionDone,  setSessionDone]  = useState(M.sessionDone)
  // transPhase: null | 'exit' | 'enter'
  const [transPhase,   setTransPhase]   = useState(M.transPhase)

  // Ref so async callbacks always read current questionNum
  const qRef = useRef(M.questionNum)
  qRef.current = questionNum

  // Use the tier that was baked into the mount state (resolved from saved session
  // or current Settings) so puzzles always match what the run was started on.
  const puzzleTier = M.puzzleTier ?? 'mini'

  const puzzle = useMemo(
    () => getPuzzle(puzzleTier, mode, questionNum - 1),
    [puzzleTier, mode, questionNum]
  )

  const [slots,       setSlots]      = useState(() => M.slots.map((s) => (s ? { ...s } : null)))
  const [operators,   setOperators]  = useState(() => [...M.operators])
  const [selIdx,      setSelIdx]     = useState(M.selIdx)
  const [gameState,   setGameState]  = useState(M.gameState)
  const [valveState,  setValveState] = useState(M.valveState)
  const [hintPipeIdx, setHintPipeIdx] = useState(M.hintPipeIdx)
  const [hintStep,    setHintStep]   = useState(M.hintStep)
  const [hintsUsed,   setHintsUsed]  = useState(M.hintsUsed)
  const [wrongMsg,    setWrongMsg]   = useState(M.wrongMsg)
  // Accessibility: screen-reader announcements for key state changes.
  // We keep this separate from visual banners so assistive tech gets a clear,
  // concise message even when the UI feedback is mostly visual.
  const [liveMsg,    setLiveMsg]     = useState('')

  // Drag-and-drop presentational state (no logic changes to existing handlers)
  const [dragIdx,      setDragIdx]      = useState(null)
  const [dragOverSlot, setDragOverSlot] = useState(null)

  const [trayShakeIdx, setTrayShakeIdx] = useState(null)
  const [slotShakeIdx, setSlotShakeIdx] = useState(null)

  // ── Progressive disclosure state ─────────────────────────────────────────
  // showHelp: opens the How-to-Play modal from inside the game (? button in tray)
  const [showHelp, setShowHelp] = useState(false)
  // mistakeCount: increments on rejected placements and failed valve — used to
  //   surface the instruction tip contextually per adaptive tier
  const [mistakeCount, setMistakeCount] = useState(0)
  // Read difficulty once per render cycle (no subscription needed — game mounts fresh per session)
  const difficulty = loadGameSettings().difficulty  // 'Easy' | 'Normal' | 'Hard'

  // ── Adaptive progressive disclosure ──────────────────────────────────────
  // Player profile loaded once on mount; never changes mid-session.
  // We use a ref so it doesn't trigger re-renders.
  const profileRef = useRef(null)
  if (profileRef.current === null) profileRef.current = loadProfile()

  // hintsUsedRef: always mirrors hintsUsed state so the transPhase-exit effect
  // can safely read it (async effects close over stale state values).
  const hintsUsedRef = useRef(hintsUsed)
  hintsUsedRef.current = hintsUsed

  // sessionMistakesRef: accumulated mistakes across all puzzles this session.
  // Used to detect sustained struggling (distinct from per-puzzle mistakeCount).
  const sessionMistakesRef = useRef(0)

  // cleanSolvesThisSession: consecutive puzzles solved without any hints.
  // Resets to 0 the moment any hint is used on a puzzle.
  const [cleanSolvesThisSession, setCleanSolvesThisSession] = useState(0)

  // ── Efficiency of use: Esc-to-back confirmation ───────────────────────────
  // Prevents accidental exits from a fast Esc press, while still allowing
  // experienced players a keyboard path back to the menu.
  const [showEscConfirm, setShowEscConfirm] = useState(false)

  const skipPuzzleResetOnce = useRef(M.skipFirstPuzzleReset)

  // Reset everything when the puzzle (question) changes
  useEffect(() => {
    if (skipPuzzleResetOnce.current) {
      skipPuzzleResetOnce.current = false
      return
    }
    setSlots(Array(puzzle.slotCount).fill(null))
    setOperators(puzzleOps(puzzle, mode))
    setSelIdx(null)
    setGameState('playing')
    setValveState('locked')
    setHintPipeIdx(null)
    setHintStep(0)
    setHintsUsed(0)
    setWrongMsg('')
    setMistakeCount(0)
  }, [puzzle, mode])

  useEffect(() => {
    if (sessionDone) {
      clearSession()
      return
    }
    saveSession(
      packSessionForStorage(mode, {
        puzzleTier,
        questionNum,
        score,
        hintsTotal,
        sessionDone,
        transPhase,
        slots,
        operators,
        selIdx,
        gameState,
        valveState,
        hintPipeIdx,
        hintStep,
        hintsUsed,
        wrongMsg,
      })
    )
  }, [
    puzzleTier,
    mode,
    questionNum,
    score,
    hintsTotal,
    sessionDone,
    transPhase,
    slots,
    operators,
    selIdx,
    gameState,
    valveState,
    hintPipeIdx,
    hintStep,
    hintsUsed,
    wrongMsg,
  ])

  // Derived
  const usedIdx    = slots.filter(Boolean).map((s) => s.pipeIdx)
  const slotVals   = slots.map((s) => (s ? s.value : null))
  const allFilled  = isComplete(slotVals)
  const liveResult = evaluateSequential(puzzle.start, slotVals, operators)
  const isMatch    = allFilled && liveResult === puzzle.target
  const isFlowing  = gameState === 'flowing'
  const isCorrect  = gameState === 'correct'
  const isActive   = gameState === 'playing' && transPhase === null

  // Hick's Law: reduce decision time by presenting tray options in a predictable order.
  // We keep the *game logic* indices unchanged (pipeIdx still refers to the original
  // position in puzzle.pipes), and only sort the *visual* rendering order.
  const sortedTrayIdx = useMemo(() => {
    return puzzle.pipes
      .map((_, i) => i)
      .sort((a, b) => puzzle.pipes[a] - puzzle.pipes[b])
  }, [puzzle.pipes])

  // Valve ready/locked mirrors match state
  useEffect(() => {
    if (gameState !== 'playing') return
    setValveState(isMatch ? 'ready' : 'locked')
  }, [isMatch, gameState])

  // ── State machine: flowing → correct (after water finishes) ──────────────
  useEffect(() => {
    if (gameState !== 'flowing') return
    const t = setTimeout(() => setGameState('correct'), 2500)
    return () => clearTimeout(t)
  }, [gameState])

  // ── State machine: correct → begin transition ─────────────────────────────
  useEffect(() => {
    if (gameState !== 'correct') return
    const t = setTimeout(() => setTransPhase('exit'), 800)
    return () => clearTimeout(t)
  }, [gameState])

  // ── Transition: exit → advance question (or end session) ────────────────
  // IMPORTANT: do NOT use a nested setTimeout here.
  // The cleanup function captures outer variables by closure, so any t2
  // assigned inside the callback would be cancelled when transPhase changes.
  // Use two separate effects (one per phase) to avoid that race condition.
  useEffect(() => {
    if (transPhase !== 'exit') return

    // ── Record puzzle result for adaptive disclosure ──────────────────────
    // hintsUsedRef holds the hint count for the puzzle just solved (before
    // the reset effect fires when questionNum advances).
    const puzzleHints = hintsUsedRef.current
    recordPuzzleSolved({ hintsUsed: puzzleHints })

    // Update consecutive-clean-solve streak:
    // increment if no hints were used, reset if any were.
    setCleanSolvesThisSession((c) => (puzzleHints === 0 ? c + 1 : 0))

    const t = setTimeout(() => {
      if (qRef.current >= GAME_LENGTH) {
        setSessionDone(true)
        setTransPhase(null)
      } else {
        setQuestionNum((q) => q + 1)
        setTransPhase('enter')
      }
    }, 360)
    return () => clearTimeout(t)
  }, [transPhase])

  // ── Record session completion for adaptive disclosure ─────────────────────
  // Fires once when sessionDone becomes true. Increments the lifetime session
  // counter so the player's base tier can advance on the next game.
  useEffect(() => {
    if (!sessionDone) return
    recordSessionComplete()
    playSfx('levelComplete')
  }, [sessionDone, playSfx])

  // ── Transition: enter → clear, making the next puzzle fully interactive ──
  useEffect(() => {
    if (transPhase !== 'enter') return
    const t = setTimeout(() => setTransPhase(null), 420)
    return () => clearTimeout(t)
  }, [transPhase])

  // Accessibility: helper to reliably re-announce the same text.
  // Setting '' first ensures screen readers treat it as a new message.
  const announce = useCallback((msg) => {
    setLiveMsg('')
    window.requestAnimationFrame(() => setLiveMsg(msg))
  }, [])

  // Accessibility: announce when a new puzzle is loaded.
  useEffect(() => {
    announce(`Puzzle ${questionNum} of ${GAME_LENGTH} loaded.`)
  }, [questionNum, announce])

  const rejectPlacement = useCallback(
    (trayPipeIdx, slotIdx) => {
      // Adaptive disclosure: track both per-puzzle and per-session mistake counts
      setMistakeCount((n) => n + 1)
      sessionMistakesRef.current += 1
      setTrayShakeIdx(trayPipeIdx)
      if (slotIdx != null) setSlotShakeIdx(slotIdx)
      playSfx('wrong')
      announce('Pipe cannot go there.')
      window.setTimeout(() => {
        setTrayShakeIdx(null)
        setSlotShakeIdx(null)
      }, 380)
    },
    [playSfx, announce]
  )

  // ── Interactions ──────────────────────────────────────────────────────────
  const handleTrayClick = useCallback((i) => {
    if (!isActive) return
    const inSlot = slots.findIndex((s) => s?.pipeIdx === i)
    if (inSlot >= 0) {
      const next = [...slots]; next[inSlot] = null
      setSlots(next); setSelIdx(null); return
    }
    setSelIdx((p) => (p === i ? null : i))
  }, [isActive, slots])

  const handleSlotClick = useCallback((i) => {
    if (!isActive) return
    if (slots[i] !== null) {
      const next = [...slots]; next[i] = null; setSlots(next); return
    }
    if (selIdx === null) return
    const firstEmpty = slots.findIndex((s) => s === null)
    if (i !== firstEmpty) {
      rejectPlacement(selIdx, i)
      return
    }
    const { ok } = validatePlacement(puzzle, slots, operators, mode, i, selIdx)
    if (!ok) {
      rejectPlacement(selIdx, i)
      return
    }
    const next = [...slots]
    next[i] = { pipeIdx: selIdx, value: puzzle.pipes[selIdx] }
    setSlots(next); setSelIdx(null)
  }, [isActive, slots, selIdx, puzzle, operators, mode, rejectPlacement])

  const handleOpToggle = useCallback((i) => {
    if (!isActive || mode !== 'mixed') return
    const next = [...operators]
    next[i] = next[i] === '+' ? '-' : '+'
    setOperators(next)
  }, [isActive, mode, operators])

  const handleValve = useCallback(() => {
    if (!isActive) return
    if (isMatch) {
      playSfx('correct')
      setValveState('open')
      setGameState('flowing')
      playSfx('flow')
      announce('Correct! Water is flowing.')
      const pts = hintsUsed === 0 ? 15 : 10
      setScore((s) => s + pts)
      setHintsTotal((h) => h + hintsUsed)
    } else if (allFilled) {
      setMistakeCount((n) => n + 1)
      sessionMistakesRef.current += 1
      playSfx('wrong')
      setValveState('failed')
      const diff = liveResult - puzzle.target
      setWrongMsg(diff > 0
        ? `Too high by ${diff} — try different pipes!`
        : `Too low by ${Math.abs(diff)} — try different pipes!`
      )
      announce('Incorrect — try again.')
      setTimeout(() => { setValveState('locked'); setWrongMsg('') }, 1400)
    }
  }, [isActive, isMatch, allFilled, liveResult, puzzle.target, hintsUsed, playSfx, announce])

  const handleReset = useCallback(() => {
    if (gameState !== 'playing' || transPhase !== null) return
    setSlots(Array(puzzle.slotCount).fill(null))
    setOperators(puzzleOps(puzzle, mode))
    setSelIdx(null); setValveState('locked')
    setHintPipeIdx(null); setHintStep(0); setWrongMsg('')
  }, [gameState, transPhase, puzzle, mode])

  const handleHint = useCallback(() => {
    if (!isActive) return
    const sol  = puzzle._solution
    const step = hintStep % sol.length
    const hVal = sol[step].val
    const idx  = puzzle.pipes.findIndex((v, i) => v === hVal && !usedIdx.includes(i))
    setHintPipeIdx(idx >= 0 ? idx : null)
    setHintStep((s) => s + 1)
    setHintsUsed((h) => h + 1)
    announce(`Hint: try pipe ${hVal}.`)
    setTimeout(() => setHintPipeIdx(null), 2400)
  }, [isActive, puzzle, hintStep, usedIdx, announce])

  // ── Efficiency of use: keyboard shortcuts ────────────────────────────────
  // All shortcuts are additive — click/drag still works normally.
  // Beginners are not impacted; experienced players get faster paths.
  //
  //   R           → reset current puzzle
  //   H           → hint
  //   Enter/Space → open valve (when valve is ready)
  //   1–9         → select the nth available (non-used) tray pipe
  //   Tab         → cycle to next available tray pipe
  //   Esc         → open back-to-menu confirmation
  useEffect(() => {
    const handleKey = (e) => {
      // Don't steal keys from inputs, the How-to-Play modal, or the Esc confirm
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (showHelp || showEscConfirm) return

      const key = e.key

      if (key === 'Escape') {
        e.preventDefault()
        setShowEscConfirm(true)
        return
      }

      // Shortcuts below only apply when the puzzle is active
      if (!isActive) return

      // Load current key bindings (live — respects any changes saved in Options)
      const kb = loadKeyBindings()

      if (key === kb.reset) {
        e.preventDefault()
        handleReset()
        return
      }

      if (key === kb.hint) {
        e.preventDefault()
        handleHint()
        return
      }

      if (key === kb.valve || key === ' ') {
        // Open valve if valid; otherwise if a pipe is selected and there is a
        // first empty slot, place it (speeds up single-click → Enter flow)
        e.preventDefault()
        if (allFilled) {
          handleValve()
        } else if (selIdx !== null) {
          const firstEmpty = slots.findIndex((s) => s === null)
          if (firstEmpty >= 0) handleSlotClick(firstEmpty)
        }
        return
      }

      // 1–9: select pipe by its FIXED tray position (1 = first pipe overall, not first available).
      // This means labels stay stable — pipe "4" is always key 4, even if pipes 1–3 are placed.
      const digit = parseInt(key, 10)
      if (!isNaN(digit) && digit >= 1 && digit <= 9) {
        e.preventDefault()
        const pipeIdx = digit - 1  // direct index into puzzle.pipes array
        if (pipeIdx < puzzle.pipes.length && !usedIdx.includes(pipeIdx)) {
          handleTrayClick(pipeIdx)
        }
        return
      }

      // Tab: cycle through available pipes in tray order
      if (key === 'Tab') {
        e.preventDefault()
        const available = puzzle.pipes
          .map((_, i) => i)
          .filter((i) => !usedIdx.includes(i))
        if (available.length === 0) return
        const currentPos = available.indexOf(selIdx ?? -1)
        const next = available[(currentPos + 1) % available.length]
        handleTrayClick(next)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [
    isActive, allFilled, selIdx, slots, usedIdx, puzzle.pipes,
    showHelp, showEscConfirm,
    handleReset, handleHint, handleValve, handleSlotClick, handleTrayClick,
  ])

  // ── Efficiency of use: auto-place when pipe is selected ──────────────────
  // When a pipe is selected and clicked again from the tray, AND there is
  // exactly one slot left, place it immediately without requiring a second
  // click on the slot. This removes one interaction step for experienced players.
  useEffect(() => {
    if (selIdx === null || !isActive) return
    const emptySlots = slots.reduce((acc, s, i) => (s === null ? [...acc, i] : acc), [])
    if (emptySlots.length !== 1) return
    const onlySlot = emptySlots[0]
    const { ok } = validatePlacement(puzzle, slots, operators, mode, onlySlot, selIdx)
    if (!ok) return
    // Auto-place: replicate handleSlotClick logic directly to avoid stale closure
    const next = [...slots]
    next[onlySlot] = { pipeIdx: selIdx, value: puzzle.pipes[selIdx] }
    setSlots(next)
    setSelIdx(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selIdx]) // only re-run when selection changes

  const trayState = (i) => {
    if (usedIdx.includes(i)) return 'used'
    if (i === hintPipeIdx)   return 'hint'
    if (i === selIdx)        return 'selected'
    if (i === dragIdx)       return 'selected'
    return ''
  }

  // ── Drag-and-drop handlers (additive — click handlers still work) ─────────
  const handleDragStart = useCallback((i) => {
    if (!isActive) return
    setDragIdx(i)
    setSelIdx(i)
  }, [isActive])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setDragOverSlot(null)
  }, [])

  const handleSlotDragOver = useCallback((e, i) => {
    e.preventDefault()
    if (!isActive || slots[i] !== null) return
    setDragOverSlot(i)
  }, [isActive, slots])

  const handleSlotDragLeave = useCallback(() => {
    setDragOverSlot(null)
  }, [])

  const handleSlotDrop = useCallback((e, i) => {
    e.preventDefault()
    setDragOverSlot(null)
    if (dragIdx === null || !isActive || slots[i] !== null) return
    const firstEmpty = slots.findIndex((s) => s === null)
    if (i !== firstEmpty) {
      rejectPlacement(dragIdx, i)
      setDragIdx(null)
      return
    }
    const { ok } = validatePlacement(puzzle, slots, operators, mode, i, dragIdx)
    if (!ok) {
      rejectPlacement(dragIdx, i)
      setDragIdx(null)
      return
    }
    const next = [...slots]
    next[i] = { pipeIdx: dragIdx, value: puzzle.pipes[dragIdx] }
    setSlots(next)
    setSelIdx(null)
    setDragIdx(null)
  }, [dragIdx, isActive, slots, puzzle, operators, mode, rejectPlacement])

  // Flow animation timing helpers
  const f = (n) => `${0.3 + n * 0.28}s`
  const flowing  = isFlowing || isCorrect
  const nSlots   = puzzle.slotCount
  const modePill = { addition: '+ Addition', subtraction: '− Subtraction', mixed: '± Mixed' }[mode]

  // Pipe board variant computation — alternating left-up / right-up
  const rowVariant = (i) => i % 2 === 0 ? 'left-up' : 'right-up'
  const boardActiveRow = isActive ? slots.findIndex(s => s === null) : -1
  const endVariant = nSlots % 2 === 0 ? 'left-up' : 'right-up'

  const boardCls = [
    'pg-pipes-area',
    transPhase === 'exit'  ? 'pg-trans-exit'  : '',
    transPhase === 'enter' ? 'pg-trans-enter' : '',
  ].filter(Boolean).join(' ')

  const valveWidgetCls = [
    'valve-widget',
    valveState === 'ready'  ? 'valve-widget--ready'  : '',
    valveState === 'open'   ? 'valve-widget--open'    : '',
    valveState === 'failed' ? 'valve-widget--failed'  : '',
  ].filter(Boolean).join(' ')

  const panelCls = [
    'puzzle-panel',
    transPhase === 'exit'  ? 'puzzle-panel--exit'  : '',
    transPhase === 'enter' ? 'puzzle-panel--enter' : '',
  ].filter(Boolean).join(' ')

  const valveStatusText =
    valveState === 'ready'  ? 'READY'  :
    valveState === 'open'   ? 'OPEN'   :
    valveState === 'failed' ? 'WRONG'  : 'LOCKED'

  const validateBtnCls = [
    'pipe-chip',
    'pipe-chip--validate',
    valveState === 'ready' ? 'pipe-chip--validate-ready' : 'pipe-chip--validate-locked',
  ].join(' ')

  // ── Adaptive progressive disclosure ──────────────────────────────────────
  // Step 1: derive the base expertise tier from the player's cumulative history.
  const baseTier = getExpertiseTier(profileRef.current, difficulty)

  // Step 2: compute in-session override signals.
  //
  //   "Struggling": the player is having a hard time RIGHT NOW.
  //     Triggers if: ≥3 mistakes on the current puzzle (acute struggle),
  //     OR if they are averaging ≥2 mistakes per finished question (sustained).
  //   When struggling, temporarily show novice-level help even for veterans.
  const avgMistakesPerQ = questionNum > 1
    ? sessionMistakesRef.current / (questionNum - 1)
    : 0
  const isStruggling = mistakeCount >= 3 || avgMistakesPerQ >= 2

  //   "On a streak": the player is performing well without help.
  //     Triggers after ≥3 consecutive hint-free solves this session.
  //   When on a streak, temporarily show expert-level UI even for beginners.
  const isOnStreak = cleanSolvesThisSession >= 3

  // Step 3: effective tier — override takes priority over base tier.
  //   struggling > streak > base profile tier
  const adaptiveTier =
    isStruggling ? 'novice'
    : isOnStreak  ? 'expert'
    : baseTier

  // Step 4: gate UI elements based on adaptiveTier + per-puzzle mistake count.
  //
  //   Instruction tip ("Select a pipe / place it on the highlighted row"):
  //     novice       → always visible while puzzle is interactive
  //     intermediate → revealed after 1 mistake
  //     expert       → revealed after 3 mistakes (or when struggling override fires)
  const showSlotTip = isActive && (
    adaptiveTier === 'novice' ||
    (adaptiveTier === 'intermediate' && mistakeCount >= 1) ||
    (adaptiveTier === 'expert'       && mistakeCount >= 3)
  )

  //   Running-total hint line below the equation:
  //     novice       → always visible
  //     intermediate → revealed after 2 mistakes
  //     expert       → revealed after 3 mistakes
  const showEqHintLine = (
    adaptiveTier === 'novice' ||
    (adaptiveTier === 'intermediate' && mistakeCount >= 2) ||
    (adaptiveTier === 'expert'       && mistakeCount >= 3)
  )

  return (
    <div className="game-background">

      {/* Background base */}
      <div className="bg-main" />

      {/* Game UI layer — centered, on top */}
      <div className="game-content">
        <div className="game-root">

        {/* ── Race Bar (top strip) ── */}
        <div className="race-bar">
          <button className="race-back-btn" onClick={onBack}>&#8592; MENU</button>
          <span className="race-label">{modePill}</span>

          <div className="race-dots" aria-label={`Question ${questionNum} of ${GAME_LENGTH}`}>
            {Array.from({ length: GAME_LENGTH }, (_, i) => (
              <div
                key={i}
                className={`race-dot${
                  i < questionNum - 1 ? ' race-dot--done' :
                  i === questionNum - 1 ? ' race-dot--active' : ''
                }`}
              />
            ))}
          </div>

          <span className="race-counter">Q{questionNum}/{GAME_LENGTH} &middot; {score}pts</span>
          {typeof onAbandon === 'function' && (
            <button type="button" className="race-abandon-btn" onClick={() => { clearSession(); onAbandon() }} title="Quit this session">
              ✕ Abandon
            </button>
          )}
        </div>

        <div className="pg-target-ribbon" aria-live="polite">
          <span className="pg-target-ribbon__prefix">TARGET</span>
          <span className="pg-target-ribbon__eq">=</span>
          <span className="pg-target-ribbon__num">{puzzle.target}</span>
        </div>

        {/* ── Main Body (valve + puzzle) ── */}
        <div className="game-body">

          {/* Validate Sidebar */}
          <div className="valve-sidebar">
            <span className="valve-label">VALIDATE</span>
            <div
              className={valveWidgetCls}
              onClick={handleValve}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleValve()
                }
              }}
              role="button"
              tabIndex={isActive ? 0 : -1}
              aria-disabled={!isActive}
              aria-label="Validate answer"
            />
            <div className="valve-pipe" />
            <span className="valve-status">{valveStatusText}</span>
          </div>

          {/* Puzzle Panel */}
          <div className={panelCls}>

            {/* Top Ruler — marks 1–20, START value highlighted */}
            <div className="ruler">
              {Array.from({ length: RULER_MAX }, (_, i) => {
                const v = i + 1
                return (
                  <span
                    key={v}
                    className={`ruler__cell${v === puzzle.start ? ' ruler__cell--active' : ''}${flowing && v <= puzzle.start ? ' ruler__cell--flowing' : ''}`}
                  >
                    {v}
                  </span>
                )
              })}
            </div>

            {/* Slot Grid */}
            <div className="slot-grid">

              {/* Progressive disclosure: tip text — shown based on difficulty + mistake count */}
              {showSlotTip && (
                <p className="slot-grid__tip">
                  {selIdx !== null
                    ? `Pipe ${puzzle.pipes[selIdx]} selected — place on the highlighted row (or drop there)`
                    : 'Select a pipe below, then place it on the highlighted row only'}
                </p>
              )}

              {/* Pipe board — connected S-curve pipe layout */}
              <div className="pb-board pb-board--inline">
                {/* SVG gradient defs (hidden, referenced by all pipe SVGs) */}
                <svg width="0" height="0" className="pb-defs">
                  <defs>
                    <linearGradient id="pb-gPipe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#ddd" />
                      <stop offset="30%"  stopColor="#b5b5b5" />
                      <stop offset="60%"  stopColor="#888" />
                      <stop offset="100%" stopColor="#555" />
                    </linearGradient>
                    {/* Grey gradient for fixed start/end pipes — slightly lighter
                        than player pipes so the equation endpoints are readable
                        but the path looks like one continuous grey pipe system. */}
                    <linearGradient id="pb-gFixedGrey" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#e8e8e8" />
                      <stop offset="30%"  stopColor="#c8c8c8" />
                      <stop offset="60%"  stopColor="#a0a0a0" />
                      <stop offset="100%" stopColor="#707070" />
                    </linearGradient>
                    <linearGradient id="pb-gShine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="white" stopOpacity="0.5" />
                      <stop offset="45%"  stopColor="white" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    {/* Water-flow gradient: bright cyan-to-blue for the animated fill */}
                    <linearGradient id="pb-gWater" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#38bdf8" />
                      <stop offset="40%"  stopColor="#22d3ee" />
                      <stop offset="70%"  stopColor="#67e8f9" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Top fixed pipe — equation starting value */}
                <div className={`pb-row pb-row--fixed${flowing ? ' pb-row--water' : ''}`}>
                  <PipeSVG variant="right-up" value={puzzle.start} kind="start"
                    isFlowing={flowing} flowDelay="0ms" />
                </div>

                <PBConnector side="left" isFlowing={flowing} flowDelay="0.25s" />

                {/* Playable rows — water flow cascades top-to-bottom with staggered delays */}
                {slots.map((slot, i) => {
                  const variant = rowVariant(i)
                  const expectedSide = i === 0
                    ? 'left'
                    : slots[i - 1] ? PIPE_VARIANTS[rowVariant(i - 1)].downSide : null

                  // Each playable row is offset by 0.45s from the start pipe.
                  // Pattern: start(0s) → conn(0.25s) → row0(0.45s) → conn(0.7s) → row1(0.9s) → ...
                  const rowDelay  = `${0.45 + i * 0.45}s`
                  const connDelay = `${0.7 + i * 0.45}s`
                  const slotFlowing = flowing && slot

                  const rowCls = [
                    'pb-row',
                    slot                                ? 'pb-row--filled'   : 'pb-row--empty',
                    boardActiveRow === i                 ? 'pb-row--active'   : '',
                    !slot && isActive && selIdx !== null ? 'pb-row--ready'    : '',
                    dragOverSlot === i                   ? 'pb-row--dragover' : '',
                    slotFlowing                          ? 'pb-row--flowing pb-row--water' : '',
                    slot?.pipeIdx === hintPipeIdx        ? 'pb-row--hinted'   : '',
                    slotShakeIdx === i                   ? 'pb-row--shake-error' : '',
                  ].filter(Boolean).join(' ')

                  return (
                    <div key={i} className="pb-slot-group">
                      <div
                        className={rowCls}
                        onClick={() => handleSlotClick(i)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSlotClick(i)
                          }
                        }}
                        onDragOver={(e) => handleSlotDragOver(e, i)}
                        onDragLeave={handleSlotDragLeave}
                        onDrop={(e) => handleSlotDrop(e, i)}
                        role="button"
                        tabIndex={isActive ? 0 : -1}
                        aria-disabled={!isActive}
                        aria-label={
                          slot
                            ? `Slot ${i + 1} — pipe ${slot.value}. Press Enter to remove.`
                            : `Slot ${i + 1} — empty. Press Enter to place the selected pipe.`
                        }
                      >
                        <span className="pb-num">{i + 1}</span>
                        {slot ? (
                          <>
                            <PipeSVG variant={variant} value={slot.value}
                              isFlowing={slotFlowing} flowDelay={rowDelay} />
                            <button
                              className={`pb-op${mode === 'mixed' ? ' pb-op--click' : ''}`}
                              onClick={(e) => { e.stopPropagation(); handleOpToggle(i) }}
                              disabled={mode !== 'mixed'}
                            >
                              {operators[i]}
                            </button>
                          </>
                        ) : (
                          <EmptySlotSVG expectedSide={expectedSide} />
                        )}
                      </div>
                      {i < nSlots - 1 && (
                        <PBConnector
                          side={slot ? PIPE_VARIANTS[variant].downSide : null}
                          isFlowing={slotFlowing}
                          flowDelay={connDelay}
                        />
                      )}
                    </div>
                  )
                })}

                <PBConnector
                  side={
                    slots[nSlots - 1]
                      ? PIPE_VARIANTS[rowVariant(nSlots - 1)].downSide
                      : null
                  }
                  isFlowing={flowing && slots[nSlots - 1]}
                  flowDelay={`${0.7 + (nSlots - 1) * 0.45}s`}
                />

                {/* Bottom fixed pipe — equation target value */}
                <div className={`pb-row pb-row--fixed${flowing ? ' pb-row--water' : ''}`}>
                  <PipeSVG variant={endVariant} value={puzzle.target} kind="end"
                    isFlowing={flowing}
                    flowDelay={`${0.45 + nSlots * 0.45}s`}
                  />
                </div>
              </div>

            </div>{/* end slot-grid */}

            {/* Equation strip — outside slot-grid so overflow never clips it */}
            <div className="pg-equation-area">
              <div
                className={`eq-strip${!allFilled ? '' : isMatch ? ' eq-strip--match' : ''}`}
                aria-label={`Equation: build the left side to equal ${puzzle.target}`}
              >
                <span className="eq-strip__num">{puzzle.start}</span>
                {slots.map((s, i) => (
                  <Fragment key={i}>
                    <span className="eq-strip__op">{operators[i]}</span>
                    <span className={`eq-strip__val ${s ? 'eq-strip__val--placed' : 'eq-strip__val--blank'}`}>
                      {s ? s.value : '?'}
                    </span>
                  </Fragment>
                ))}
                <span className="eq-strip__eq">=</span>
                <strong className="eq-strip__result eq-strip__goal">{puzzle.target}</strong>
                {isMatch && <span className="eq-strip__check"> &#10003;</span>}
              </div>

              {/* Progressive disclosure: running-total detail hidden by default on Normal/Hard */}
              {showEqHintLine && (
                <p className={`pg-eq-hint${isMatch ? ' pg-eq-hint--match' : ''}`}>
                  {!allFilled && (
                    <>Running total (left): <strong>{liveResult}</strong></>
                  )}
                  {allFilled && !isMatch && (
                    <>
                      Left side = <strong>{liveResult}</strong>, goal = <strong>{puzzle.target}</strong>
                      <span className="pg-eq-hint__warn"> — adjust pipes or operators</span>
                    </>
                  )}
                  {isMatch && <span>Left side equals the goal.</span>}
                </p>
              )}
            </div>

            {/* Bottom Ruler — marks 1–20, TARGET value highlighted */}
            <div className="ruler ruler--bottom">
              {Array.from({ length: RULER_MAX }, (_, i) => {
                const v = i + 1
                return (
                  <span
                    key={v}
                    className={`ruler__cell${v === puzzle.target ? ' ruler__cell--active' : ''}${flowing && v <= puzzle.target ? ' ruler__cell--flowing' : ''}`}
                  >
                    {v}
                  </span>
                )
              })}
            </div>

          </div>{/* end puzzle-panel */}
        </div>{/* end game-body */}

        {/* ── Pipes Bar (bottom toolbar) ── */}
        <div className="pipes-bar">
          <div className="pipes-bar__header">
            <span className="pipes-bar__label">{puzzle.pipes.length - usedIdx.length} pipes left</span>
            <div className="pipes-bar__actions">
              {/* Efficiency of use: keyboard shortcut badges shown next to each button.
                  Subtle enough not to clutter, useful for returning players. */}
              <button
                type="button"
                className="pipe-chip pipe-chip--action"
                onClick={handleReset}
                disabled={gameState !== 'playing' || transPhase !== null}
                title="Reset puzzle [R]"
              >&#8635; RESET<kbd className="kbd-hint">R</kbd></button>
              <button
                type="button"
                className="pipe-chip pipe-chip--action"
                onClick={handleHint}
                disabled={!isActive}
                title="Hint [H]"
              >? HINT<kbd className="kbd-hint">H</kbd></button>
              <button
                type="button"
                className={validateBtnCls}
                onClick={handleValve}
                disabled={!allFilled || !isActive}
                title={allFilled ? 'Validate answer [Enter]' : 'Fill all slots first'}
                aria-label="Validate answer"
              >&#10003; VALIDATE<kbd className="kbd-hint">↵</kbd></button>
              {/* Progressive disclosure: "How it works" — reveals full explanation on demand */}
              <button
                type="button"
                className="pipe-chip pipe-chip--action pipe-chip--how"
                onClick={() => setShowHelp(true)}
                title="How to play"
              >&#9432; HOW</button>
            </div>
          </div>
          <div className="pipes-list">
            {(() => {
              const mid = Math.ceil(sortedTrayIdx.length / 2)
              const first = sortedTrayIdx.slice(0, mid)
              const second = sortedTrayIdx.slice(mid)

              const renderChip = (i) => {
                const val = puzzle.pipes[i]
                const st = trayState(i)
              const chipCls = [
                'pipe-chip',
                st === 'selected' ? 'pipe-chip--selected' : '',
                st === 'used'     ? 'pipe-chip--used'     : '',
                st === 'hint'     ? 'pipe-chip--hinted'   : '',
                trayShakeIdx === i ? 'pipe-chip--shake-error' : '',
              ].filter(Boolean).join(' ')

              // Efficiency of use: each pipe's keyboard number is its FIXED tray position (i+1).
              // The number never changes when other pipes are placed — pipe "4" is always "4".
              // Only show badge if within 1–9 range and the pipe is still available.
              const kbdNum = i < 9 ? i + 1 : null

              return (
                <button
                  key={i}
                  className={chipCls}
                  onClick={() => handleTrayClick(i)}
                  draggable={st !== 'used' && isActive}
                  onDragStart={() => handleDragStart(i)}
                  onDragEnd={handleDragEnd}
                  disabled={st === 'used'}
                  aria-label={`Pipe ${val}${kbdNum ? ` — key ${kbdNum}` : ''}`}
                  title={kbdNum && st !== 'used' ? `Pipe ${val} — press ${kbdNum}` : `Pipe ${val}`}
                >
                  <span className="pipe-chip__body">{val}</span>
                  {/* Fixed position badge: always matches key number, never re-labels when others are used */}
                  {kbdNum && st !== 'used' && (
                    <kbd className="kbd-hint kbd-hint--pipe">{kbdNum}</kbd>
                  )}
                </button>
              )
              }

              return (
                <>
                  {first.map(renderChip)}
                  <div className="pipes-list__divider" aria-hidden="true" />
                  {second.map(renderChip)}
                </>
              )
            })()}
          </div>
        </div>

        {/* ── Overlays ── */}
        {wrongMsg && <div className="wrong-banner">{wrongMsg}</div>}
        {/* Accessibility: screen-reader live announcements (assertive so mistakes/success are heard). */}
        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {liveMsg}
        </div>

        {isCorrect && (
          <div className="correct-flash">
            &#10003; Correct! +{hintsUsed === 0 ? 15 : 10} pts
          </div>
        )}

        {sessionDone && (
          <EndScreen
            score={score}
            hintsTotal={hintsTotal}
            onPlayAgain={() => { clearSession(); onPlayAgain() }}
            onHome={() => { clearSession(); onBack() }}
          />
        )}

        {/* Efficiency of use: Esc confirmation — prevents accidental back navigation.
            Experienced players can confirm quickly; beginners are protected from
            accidentally losing progress with a stray Esc press.               */}
        {showEscConfirm && (
          <div className="esc-confirm-overlay" role="dialog" aria-modal="true" aria-label="Leave game?">
            <div className="esc-confirm-panel">
              <p className="esc-confirm-msg">Leave this session and go back to the menu?</p>
              <p className="esc-confirm-sub">Your progress is saved — you can continue any time.</p>
              <div className="esc-confirm-btns">
                <button
                  type="button"
                  className="esc-confirm-btn esc-confirm-btn--go"
                  onClick={() => { setShowEscConfirm(false); onBack() }}
                  autoFocus
                >
                  Yes, go to menu <kbd className="kbd-hint">Enter</kbd>
                </button>
                <button
                  type="button"
                  className="esc-confirm-btn esc-confirm-btn--stay"
                  onClick={() => setShowEscConfirm(false)}
                >
                  Stay &amp; keep playing <kbd className="kbd-hint">Esc</kbd>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progressive disclosure: full How-to-Play opens on demand from the ? HOW button.
            Passes current mode so the explanation matches exactly what the player is doing. */}
        {showHelp && (
          <HowToPlayModal mode={mode} onClose={() => setShowHelp(false)} />
        )}

      </div>
      </div>
    </div>
  )
}

export default PipesGame
