import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react'
import { getPuzzle }            from './puzzleGenerator'
import { evaluate, isComplete } from './evaluator'
import './PipesGame.css'
import './PipePuzzleDesign.css'

const GAME_LENGTH = 8   // questions per session
const RULER_MAX   = 20  // fixed 1–20 ruler on both pipes

function defaultOps(count, mode) {
  return Array(count).fill(mode === 'subtraction' ? '-' : '+')
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
function EndScreen({ score, hintsTotal, onHome }) {
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
        <button className="pg-btn pg-btn-home" onClick={onHome}>
          ← Back to Menu
        </button>
      </div>
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────────
function PipesGame({ mode, onBack }) {
  const [questionNum,  setQuestionNum]  = useState(1)
  const [score,        setScore]        = useState(0)
  const [hintsTotal,   setHintsTotal]   = useState(0)
  const [sessionDone,  setSessionDone]  = useState(false)
  // transPhase: null | 'exit' | 'enter'
  const [transPhase,   setTransPhase]   = useState(null)

  // Ref so async callbacks always read current questionNum
  const qRef = useRef(1)
  qRef.current = questionNum

  // All 8 questions use 'mini' difficulty — keeps all values within 1–20
  const puzzle = useMemo(
    () => getPuzzle('mini', mode, questionNum - 1),
    [mode, questionNum]
  )

  const [slots,       setSlots]      = useState(() => Array(puzzle.slotCount).fill(null))
  const [operators,   setOperators]  = useState(() => defaultOps(puzzle.slotCount, mode))
  const [selIdx,      setSelIdx]     = useState(null)
  const [gameState,   setGameState]  = useState('playing')
  const [valveState,  setValveState] = useState('locked')
  const [hintPipeIdx, setHintPipeIdx] = useState(null)
  const [hintStep,    setHintStep]   = useState(0)
  const [hintsUsed,   setHintsUsed]  = useState(0)
  const [wrongMsg,    setWrongMsg]   = useState('')

  // Drag-and-drop presentational state (no logic changes to existing handlers)
  const [dragIdx,      setDragIdx]      = useState(null)
  const [dragOverSlot, setDragOverSlot] = useState(null)

  // Reset everything when the puzzle (question) changes
  useEffect(() => {
    setSlots(Array(puzzle.slotCount).fill(null))
    setOperators(defaultOps(puzzle.slotCount, mode))
    setSelIdx(null)
    setGameState('playing')
    setValveState('locked')
    setHintPipeIdx(null)
    setHintStep(0)
    setHintsUsed(0)
    setWrongMsg('')
  }, [puzzle, mode])

  // Derived
  const usedIdx    = slots.filter(Boolean).map((s) => s.pipeIdx)
  const slotVals   = slots.map((s) => (s ? s.value : null))
  const allFilled  = isComplete(slotVals)
  const liveResult = evaluate(puzzle.start, slotVals, operators)
  const isMatch    = allFilled && liveResult === puzzle.target
  const isFlowing  = gameState === 'flowing'
  const isCorrect  = gameState === 'correct'
  const isActive   = gameState === 'playing' && transPhase === null

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

  // ── Transition: enter → clear, making the next puzzle fully interactive ──
  useEffect(() => {
    if (transPhase !== 'enter') return
    const t = setTimeout(() => setTransPhase(null), 420)
    return () => clearTimeout(t)
  }, [transPhase])

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
    const next = [...slots]
    next[i] = { pipeIdx: selIdx, value: puzzle.pipes[selIdx] }
    setSlots(next); setSelIdx(null)
  }, [isActive, slots, selIdx, puzzle.pipes])

  const handleOpToggle = useCallback((i) => {
    if (!isActive || mode !== 'mixed') return
    const next = [...operators]
    next[i] = next[i] === '+' ? '-' : '+'
    setOperators(next)
  }, [isActive, mode, operators])

  const handleValve = useCallback(() => {
    if (!isActive) return
    if (isMatch) {
      setValveState('open')
      setGameState('flowing')
      const pts = hintsUsed === 0 ? 15 : 10
      setScore((s) => s + pts)
      setHintsTotal((h) => h + hintsUsed)
    } else if (allFilled) {
      setValveState('failed')
      const diff = liveResult - puzzle.target
      setWrongMsg(diff > 0
        ? `Too high by ${diff} — try different pipes!`
        : `Too low by ${Math.abs(diff)} — try different pipes!`
      )
      setTimeout(() => { setValveState('locked'); setWrongMsg('') }, 1400)
    }
  }, [isActive, isMatch, allFilled, liveResult, puzzle.target, hintsUsed])

  const handleReset = useCallback(() => {
    if (gameState !== 'playing' || transPhase !== null) return
    setSlots(Array(puzzle.slotCount).fill(null))
    setOperators(defaultOps(puzzle.slotCount, mode))
    setSelIdx(null); setValveState('locked')
    setHintPipeIdx(null); setHintStep(0); setWrongMsg('')
  }, [gameState, transPhase, puzzle.slotCount, mode])

  const handleHint = useCallback(() => {
    if (!isActive) return
    const sol  = puzzle._solution
    const step = hintStep % sol.length
    const hVal = sol[step].val
    const idx  = puzzle.pipes.findIndex((v, i) => v === hVal && !usedIdx.includes(i))
    setHintPipeIdx(idx >= 0 ? idx : null)
    setHintStep((s) => s + 1)
    setHintsUsed((h) => h + 1)
    setTimeout(() => setHintPipeIdx(null), 2400)
  }, [isActive, puzzle, hintStep, usedIdx])

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
    const next = [...slots]
    next[i] = { pipeIdx: dragIdx, value: puzzle.pipes[dragIdx] }
    setSlots(next)
    setSelIdx(null)
    setDragIdx(null)
  }, [dragIdx, isActive, slots, puzzle.pipes])

  // Flow animation timing helpers
  const f = (n) => `${0.3 + n * 0.28}s`
  const flowing  = isFlowing || isCorrect
  const nSlots   = puzzle.slotCount
  const modePill = { addition: '+ Addition', subtraction: '− Subtraction', mixed: '± Mixed' }[mode]

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

          <div className="race-player race-player--you">
            <span className="race-player__name">PROGRESS</span>
            <div className="race-player__track">
              <div
                className="race-player__fill"
                style={{ width: `${((questionNum - 1) / GAME_LENGTH) * 100}%` }}
              />
            </div>
            <div className="race-player__icon">&#9679;</div>
          </div>

          <span className="race-counter">Q{questionNum}/{GAME_LENGTH} &middot; {score}pts</span>
        </div>

        {/* ── Main Body (valve + puzzle) ── */}
        <div className="game-body">

          {/* Valve Sidebar */}
          <div className="valve-sidebar">
            <span className="valve-label">VALVE</span>
            <div className={valveWidgetCls} onClick={handleValve} role="button" aria-label="Open valve" />
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

              {/* Tip text */}
              {isActive && (
                <p className="slot-grid__tip">
                  {selIdx !== null
                    ? `Pipe ${puzzle.pipes[selIdx]} selected — click a slot to place`
                    : 'Select a pipe below, then click a slot'}
                </p>
              )}

              {/* Slot row */}
              <div className="slot-row slot-row--center">
                {slots.map((slot, i) => {
                  const slotCls = [
                    'slot',
                    slot                                          ? 'slot--filled'   : '',
                    !slot && isActive && selIdx !== null           ? 'slot--ready'    : '',
                    !slot && dragOverSlot === i                    ? 'slot--dragover' : '',
                    flowing && slot                               ? 'slot--flowing'  : '',
                    slot?.pipeIdx === hintPipeIdx                  ? 'slot--hinted'   : '',
                  ].filter(Boolean).join(' ')

                  return (
                    <div
                      key={i}
                      className={slotCls}
                      onClick={() => handleSlotClick(i)}
                      onDragOver={(e) => handleSlotDragOver(e, i)}
                      onDragLeave={handleSlotDragLeave}
                      onDrop={(e) => handleSlotDrop(e, i)}
                    >
                      {slot ? (
                        <>
                          <button
                            className={`slot__op${mode === 'mixed' ? ' slot__op--clickable' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleOpToggle(i) }}
                            disabled={mode !== 'mixed'}
                          >
                            {operators[i]}
                          </button>
                          <span className="slot__val">{slot.value}</span>
                        </>
                      ) : (
                        <span className="slot__ph">?</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Live equation strip */}
              <div className={`eq-strip${!allFilled ? '' : isMatch ? ' eq-strip--match' : ''}`}>
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
                <strong className="eq-strip__result">{allFilled ? liveResult : '?'}</strong>
                {isMatch && <span className="eq-strip__check"> &#10003;</span>}
              </div>

            </div>{/* end slot-grid */}

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

        {/* ── Goal Footer ── */}
        <div className="goal-footer">
          <div className="goal-footer__icon" />
          <div className="goal-footer__text">
            <strong>START: {puzzle.start} &rarr; TARGET: {puzzle.target}</strong>
            {' '}&#8212; Fill all slots so the equation reaches the target.
            {' '}({puzzle.pipes.length - usedIdx.length} pipes remaining)
          </div>
        </div>

        {/* ── Pipes Bar (bottom toolbar) ── */}
        <div className="pipes-bar">
          <div className="pipes-bar__header">
            <span className="pipes-bar__label">PIPE PIECES &mdash; {puzzle.pipes.length - usedIdx.length} left</span>
            <div className="pipes-bar__actions">
              <button
                className="pipe-chip pipe-chip--action"
                onClick={handleReset}
                disabled={gameState !== 'playing' || transPhase !== null}
              >&#8635; RESET</button>
              <button
                className="pipe-chip pipe-chip--action"
                onClick={handleHint}
                disabled={!isActive}
              >? HINT</button>
              <button
                className={`pipe-chip${valveState === 'ready' ? ' pipe-chip--selected' : ' pipe-chip--action'}`}
                onClick={handleValve}
                disabled={!allFilled || !isActive}
              >&#9881; VALVE</button>
            </div>
          </div>
          <div className="pipes-list">
            {puzzle.pipes.map((val, i) => {
              const st = trayState(i)
              const chipCls = [
                'pipe-chip',
                st === 'selected' ? 'pipe-chip--selected' : '',
                st === 'used'     ? 'pipe-chip--used'     : '',
                st === 'hint'     ? 'pipe-chip--hinted'   : '',
              ].filter(Boolean).join(' ')

              return (
                <button
                  key={i}
                  className={chipCls}
                  onClick={() => handleTrayClick(i)}
                  draggable={st !== 'used' && isActive}
                  onDragStart={() => handleDragStart(i)}
                  onDragEnd={handleDragEnd}
                  disabled={st === 'used'}
                  aria-label={`Pipe ${val}`}
                >
                  <span className="pipe-chip__body">{val}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Overlays ── */}
        {wrongMsg && <div className="wrong-banner">{wrongMsg}</div>}

        {isCorrect && (
          <div className="correct-flash">
            &#10003; Correct! +{hintsUsed === 0 ? 15 : 10} pts
          </div>
        )}

        {sessionDone && (
          <EndScreen score={score} hintsTotal={hintsTotal} onHome={onBack} />
        )}

      </div>
      </div>
    </div>
  )
}

export default PipesGame
