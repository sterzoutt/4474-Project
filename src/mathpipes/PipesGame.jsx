import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react'
import { getPuzzle }            from './puzzleGenerator'
import { evaluate, isComplete } from './evaluator'
import './PipesGame.css'

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

  // ── Transition: exit → (increment question or end) → enter ───────────────
  useEffect(() => {
    if (transPhase !== 'exit') return
    let t2
    const t = setTimeout(() => {
      if (qRef.current >= GAME_LENGTH) {
        setSessionDone(true)
        setTransPhase(null)
      } else {
        setQuestionNum((q) => q + 1)
        setTransPhase('enter')
        t2 = setTimeout(() => setTransPhase(null), 420)
      }
    }, 360)
    return () => { clearTimeout(t); clearTimeout(t2) }
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
    return ''
  }

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

  return (
    <div className="pg-scene">

      {/* ── Fixed header ── */}
      <header className="pg-header">
        <button className="pg-back-btn" onClick={onBack}>&#8592; Menu</button>

        <div className="pg-header-mid">
          <span className="pg-mode-pill">{modePill}</span>
          {/* Progress dots */}
          <div className="pg-prog-dots" aria-label={`Question ${questionNum} of ${GAME_LENGTH}`}>
            {Array.from({ length: GAME_LENGTH }, (_, i) => (
              <div
                key={i}
                className={`pg-dot ${
                  i < questionNum - 1 ? 'pg-dot-done' :
                  i === questionNum - 1 ? 'pg-dot-active' : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div className="pg-header-right">
          <span className="pg-qnum">Q {questionNum}/{GAME_LENGTH}</span>
          <span className="pg-score">⭐ {score}</span>
        </div>
      </header>

      {/* ── Transitioning pipes area ── */}
      <div className={boardCls}>

        {/* TOP MEASUREMENT PIPE + VALVE */}
        <div className="pg-top-row">
          <div className="pg-pipe-col">
            <MeasurePipe
              markedVal={puzzle.start}
              markerLabel="START"
              isStart={true}
              isFlowing={flowing}
              flowDelay={f(0)}
            />
          </div>
          <div className="pg-valve-col">
            <Valve state={valveState} onClick={handleValve} />
            <span className="pg-valve-lbl">
              {valveState === 'ready'  && '▶ Open!'}
              {valveState === 'locked' && 'Locked'}
              {valveState === 'open'   && 'Open'}
              {valveState === 'failed' && '✕ Wrong'}
            </span>
          </div>
        </div>

        {/* Connector down from top pipe */}
        <VConn flowing={flowing} delay={f(1)} />

        {/* ── PATH / SLOT AREA ── */}
        <div className="pg-path-zone">

          {/* Tip text */}
          <p className="pg-tip">
            {isActive && selIdx !== null
              ? `Pipe ${puzzle.pipes[selIdx]} ready — tap a slot`
              : isActive
                ? 'Tap a pipe below, then tap a slot'
                : null}
          </p>

          {/* Slot row */}
          <div className="pg-path-row">
            {slots.map((slot, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <div
                    className={`pg-pjoin${flowing ? ' pg-flowing' : ''}`}
                    style={{ animationDelay: f(1.5 + i * 0.28) }}
                  />
                )}
                <PathSlot
                  slot={slot}
                  operator={operators[i]}
                  mode={mode}
                  isReady={isActive && selIdx !== null && !slot}
                  isFlowing={flowing}
                  isHinted={slot?.pipeIdx === hintPipeIdx}
                  flowDelay={f(1.5 + i * 0.28)}
                  onSlotClick={() => handleSlotClick(i)}
                  onOpToggle={() => handleOpToggle(i)}
                />
              </Fragment>
            ))}
          </div>

          {/* Live equation — styled as a gauge panel in the pipe scene */}
          <div className={`pg-eqstrip${!allFilled ? '' : isMatch ? ' pg-eq-ok' : ' pg-eq-miss'}`}>
            <span className="pg-eq-s">{puzzle.start}</span>
            {slots.map((s, i) => (
              <Fragment key={i}>
                <span className="pg-eq-op">{operators[i]}</span>
                <span className={`pg-eq-v ${s ? 'pg-eq-placed' : 'pg-eq-blank'}`}>
                  {s ? s.value : '?'}
                </span>
              </Fragment>
            ))}
            <span className="pg-eq-eq"> = </span>
            <strong className="pg-eq-r">{allFilled ? liveResult : '?'}</strong>
            {isMatch && <span className="pg-eq-ok-chk"> ✓</span>}
          </div>

          {/* Correct flash banner (shows briefly before transition) */}
          {isCorrect && (
            <div className="pg-correct-flash">
              ✓ Correct! +{hintsUsed === 0 ? 15 : 10} pts
            </div>
          )}
        </div>

        {/* Connector up to bottom pipe */}
        <VConn
          flowing={flowing}
          delay={f(1.5 + nSlots * 0.28 + 0.3)}
        />

        {/* BOTTOM MEASUREMENT PIPE */}
        <MeasurePipe
          markedVal={puzzle.target}
          markerLabel="TARGET"
          isStart={false}
          isFlowing={flowing}
          flowDelay={f(1.5 + nSlots * 0.28 + 0.6)}
        />

      </div>{/* end pg-pipes-area */}

      {/* Wrong-answer banner (outside transition so it shows stably) */}
      {wrongMsg && <div className="pg-wrong-banner">{wrongMsg}</div>}

      {/* ── Action buttons ── */}
      <div className="pg-actions">
        <button
          className="pg-btn pg-btn-reset"
          onClick={handleReset}
          disabled={gameState !== 'playing' || transPhase !== null}
        >⟲ Reset</button>
        <button
          className="pg-btn pg-btn-hint"
          onClick={handleHint}
          disabled={!isActive}
        >💡 Hint</button>
        <button
          className={`pg-btn pg-btn-valve${valveState === 'ready' ? ' pg-btn-valve-ready' : ''}`}
          onClick={handleValve}
          disabled={!allFilled || !isActive}
        >🔧 Open Valve</button>
      </div>

      {/* ── Pipe tray ── */}
      <div className="pg-tray-zone">
        <div className="pg-tray-hdr">
          <span className="pg-tray-title">Pipe Pieces</span>
          <span className="pg-tray-count">{puzzle.pipes.length - usedIdx.length} left</span>
        </div>
        <div className="pg-tray">
          {puzzle.pipes.map((val, i) => (
            <TrayPipe
              key={i}
              value={val}
              state={trayState(i)}
              onClick={() => handleTrayClick(i)}
            />
          ))}
        </div>
      </div>

      {/* ── Session complete ── */}
      {sessionDone && (
        <EndScreen score={score} hintsTotal={hintsTotal} onHome={onBack} />
      )}

    </div>
  )
}

export default PipesGame
