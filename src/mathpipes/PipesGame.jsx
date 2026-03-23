import { useState, useMemo, useEffect, useCallback, Fragment } from 'react'
import { getPuzzle }                   from './puzzleGenerator'
import { evaluate, isComplete, checkAnswer } from './evaluator'
import './PipesGame.css'

// ── Difficulty auto-scales with level ────────────────────────────────────────
function diffForLevel(idx) {
  if (idx < 5)  return 'easy'
  if (idx < 12) return 'medium'
  return 'hard'
}

function defaultOps(count, mode) {
  return Array(count).fill(mode === 'subtraction' ? '-' : '+')
}

// ── Valve SVG ────────────────────────────────────────────────────────────────
// state: 'locked' | 'ready' | 'open' | 'failed'
function Valve({ state, onClick }) {
  const palettes = {
    locked: { rim: '#6b7280', fill: '#374151', spoke: '#4b5563', hub: '#9ca3af' },
    ready:  { rim: '#22c55e', fill: '#166534', spoke: '#16a34a', hub: '#86efac' },
    open:   { rim: '#38bdf8', fill: '#075985', spoke: '#0ea5e9', hub: '#7dd3fc' },
    failed: { rim: '#ef4444', fill: '#7f1d1d', spoke: '#dc2626', hub: '#fca5a5' },
  }
  const p = palettes[state] ?? palettes.locked

  return (
    <svg
      className={`pg-valve pg-valve-${state}`}
      width="68" height="68"
      viewBox="0 0 68 68"
      onClick={onClick}
      role="button"
      aria-label="Open valve"
    >
      {/* Top handle */}
      <rect x="27" y="2" width="14" height="16" rx="5" fill={p.rim} />
      {/* Rim */}
      <circle cx="34" cy="34" r="28" fill={p.fill} stroke={p.rim} strokeWidth="5" />
      {/* Cross spokes */}
      <line x1="34" y1="10"  x2="34" y2="58" stroke={p.spoke} strokeWidth="5" strokeLinecap="round" />
      <line x1="10"  y1="34" x2="58" y2="34" stroke={p.spoke} strokeWidth="5" strokeLinecap="round" />
      <line x1="14" y1="14" x2="54" y2="54" stroke={p.spoke} strokeWidth="3" strokeLinecap="round" />
      <line x1="54" y1="14" x2="14" y2="54" stroke={p.spoke} strokeWidth="3" strokeLinecap="round" />
      {/* Hub */}
      <circle cx="34" cy="34" r="9"  fill={p.hub} stroke={p.rim} strokeWidth="2" />
      {/* Shine */}
      <ellipse cx="24" cy="22" rx="6" ry="4" fill="rgba(255,255,255,0.12)" />
    </svg>
  )
}

// ── Pipe tray piece ───────────────────────────────────────────────────────────
function TrayPipe({ value, state, onClick }) {
  // state: '' | 'selected' | 'used' | 'hint'
  return (
    <button
      className={`pg-tray-pipe pg-tray-${state || 'idle'}`}
      onClick={onClick}
      disabled={state === 'used'}
      aria-label={`Pipe ${value}`}
    >
      <span className="pg-tray-cap" />
      <span className="pg-tray-body">{value}</span>
      <span className="pg-tray-cap" />
    </button>
  )
}

// ── Path slot (one segment in the pipe path) ─────────────────────────────────
function PathSlot({ slot, operator, mode, isReady, isFlowing, isHinted, flowDelay, onSlotClick, onOpToggle }) {
  const filled = slot !== null
  const cls = [
    'pg-path-slot',
    filled    ? 'pg-slot-filled' : 'pg-slot-empty',
    isReady   ? 'pg-slot-ready'  : '',
    isFlowing ? 'pg-flowing'     : '',
    isHinted  ? 'pg-slot-hinted' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      style={isFlowing ? { animationDelay: flowDelay } : undefined}
      onClick={onSlotClick}
    >
      {filled ? (
        <div className="pg-slot-inner">
          <button
            className={`pg-op-tag ${mode === 'mixed' ? 'pg-op-clickable' : ''}`}
            onClick={(e) => { e.stopPropagation(); onOpToggle() }}
            disabled={mode !== 'mixed'}
          >
            {operator}
          </button>
          <span className="pg-slot-val">{slot.value}</span>
        </div>
      ) : (
        <span className="pg-slot-ph">?</span>
      )}
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────────
function PipesGame({ mode, onBack }) {
  const [levelIndex, setLevelIndex] = useState(0)
  const [score,      setScore]      = useState(0)

  const difficulty = diffForLevel(levelIndex)
  const puzzle     = useMemo(
    () => getPuzzle(difficulty, mode, levelIndex),
    [difficulty, mode, levelIndex]
  )

  // slots[i] = { pipeIdx, value } | null
  const [slots,       setSlots]      = useState(() => Array(puzzle.slotCount).fill(null))
  const [operators,   setOperators]  = useState(() => defaultOps(puzzle.slotCount, mode))
  const [selIdx,      setSelIdx]     = useState(null)    // tray index selected
  const [gameState,   setGameState]  = useState('playing') // playing|flowing|correct|failed
  const [valveState,  setValveState] = useState('locked')
  const [hintPipeIdx, setHintPipeIdx] = useState(null)
  const [hintStep,    setHintStep]   = useState(0)
  const [hintsUsed,   setHintsUsed]  = useState(0)
  const [wrongMsg,    setWrongMsg]   = useState('')

  // ── Reset on puzzle change ────────────────────────────────────────────────
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

  // ── Derived values ────────────────────────────────────────────────────────
  const usedIdx        = slots.filter(Boolean).map((s) => s.pipeIdx)
  const slotVals       = slots.map((s) => (s ? s.value : null))
  const allFilled      = isComplete(slotVals)
  const liveResult     = evaluate(puzzle.start, slotVals, operators)
  const isMatch        = allFilled && liveResult === puzzle.target
  const isFlowing      = gameState === 'flowing'
  const isCorrect      = gameState === 'correct'

  // Keep valve state in sync with match
  useEffect(() => {
    if (gameState !== 'playing') return
    setValveState(isMatch ? 'ready' : 'locked')
  }, [isMatch, gameState])

  // Flowing → correct after animation
  useEffect(() => {
    if (!isFlowing) return
    const t = setTimeout(() => setGameState('correct'), 2800)
    return () => clearTimeout(t)
  }, [isFlowing])

  // ── Interactions ──────────────────────────────────────────────────────────
  const handleTrayClick = useCallback((pipeIdx) => {
    if (gameState !== 'playing') return
    const inSlot = slots.findIndex((s) => s?.pipeIdx === pipeIdx)
    if (inSlot >= 0) {
      // Pull back out of slot
      const next = [...slots]; next[inSlot] = null
      setSlots(next); setSelIdx(null); return
    }
    setSelIdx((p) => (p === pipeIdx ? null : pipeIdx))
  }, [gameState, slots])

  const handleSlotClick = useCallback((slotIdx) => {
    if (gameState !== 'playing') return
    if (slots[slotIdx] !== null) {
      // Remove from slot
      const next = [...slots]; next[slotIdx] = null
      setSlots(next); return
    }
    if (selIdx === null) return
    const next = [...slots]
    next[slotIdx] = { pipeIdx: selIdx, value: puzzle.pipes[selIdx] }
    setSlots(next); setSelIdx(null)
  }, [gameState, slots, selIdx, puzzle.pipes])

  const handleOpToggle = useCallback((slotIdx) => {
    if (gameState !== 'playing' || mode !== 'mixed') return
    const next = [...operators]
    next[slotIdx] = next[slotIdx] === '+' ? '-' : '+'
    setOperators(next)
  }, [gameState, mode, operators])

  const handleValve = useCallback(() => {
    if (gameState !== 'playing') return
    if (isMatch) {
      setValveState('open')
      setGameState('flowing')
      setScore((s) => s + (hintsUsed === 0 ? 15 : 10))
    } else if (allFilled) {
      // Wrong — rattle the valve
      setValveState('failed')
      const diff = liveResult - puzzle.target
      setWrongMsg(
        diff > 0
          ? `Too high by ${diff} — adjust your pipes!`
          : `Too low by ${Math.abs(diff)} — adjust your pipes!`
      )
      setTimeout(() => { setValveState('locked'); setWrongMsg('') }, 1400)
    }
  }, [gameState, isMatch, allFilled, liveResult, puzzle.target, hintsUsed])

  const handleReset = useCallback(() => {
    setSlots(Array(puzzle.slotCount).fill(null))
    setOperators(defaultOps(puzzle.slotCount, mode))
    setSelIdx(null); setGameState('playing'); setValveState('locked')
    setHintPipeIdx(null); setHintStep(0); setWrongMsg('')
  }, [puzzle.slotCount, mode])

  const handleHint = useCallback(() => {
    if (gameState !== 'playing') return
    const sol   = puzzle._solution
    const step  = hintStep % sol.length
    const hVal  = sol[step].val
    const idx   = puzzle.pipes.findIndex((v, i) => v === hVal && !usedIdx.includes(i))
    setHintPipeIdx(idx >= 0 ? idx : null)
    setHintStep((s) => s + 1)
    setHintsUsed((h) => h + 1)
    setTimeout(() => setHintPipeIdx(null), 2400)
  }, [gameState, puzzle, hintStep, usedIdx])

  const handleNext = useCallback(() => setLevelIndex((l) => l + 1), [])

  // ── Tray pipe state string ────────────────────────────────────────────────
  const trayState = (i) => {
    if (usedIdx.includes(i)) return 'used'
    if (i === hintPipeIdx)   return 'hint'
    if (i === selIdx)        return 'selected'
    return ''
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const modeLabel = { addition: '+', subtraction: '−', mixed: '±' }
  const nPipes = puzzle.slotCount

  return (
    <div className="pg-scene">

      {/* ── Header bar ── */}
      <header className="pg-header">
        <button className="pg-back-btn" onClick={onBack}>&#8592; Menu</button>
        <span className="pg-mode-pill">{modeLabel[mode]} {mode}</span>
        <div className="pg-stats">
          <span className="pg-level">Lv {levelIndex + 1}</span>
          <span className="pg-score">⭐ {score}</span>
        </div>
      </header>

      {/* ── Scene ── */}
      <div className="pg-game-wrap">

        {/* TOP PIPE ─────────────────────────────────────────── */}
        <div className="pg-top-zone">
          <div className={`pg-h-pipe pg-top-pipe${isFlowing || isCorrect ? ' pg-flowing' : ''}`}>
            {/* Bolts */}
            <span className="pg-bolt pg-bolt-l" />
            {/* Start badge */}
            <div className="pg-start-badge">
              <span className="pg-badge-label">START</span>
              <span className="pg-badge-num">{puzzle.start}</span>
            </div>
            {/* Pipe body fill */}
            <div className="pg-pipe-body-fill" />
            {/* Valve mount area */}
            <div className="pg-valve-area">
              <Valve state={valveState} onClick={handleValve} />
              <span className="pg-valve-hint">
                {valveState === 'ready'  && 'Open!'}
                {valveState === 'open'   && 'Open'}
                {valveState === 'locked' && 'Locked'}
                {valveState === 'failed' && 'Wrong!'}
              </span>
            </div>
            <span className="pg-bolt pg-bolt-r" />
          </div>

          {/* Vertical connector down to path */}
          <div className={`pg-v-connector${isFlowing || isCorrect ? ' pg-flowing' : ''}`}
               style={{ animationDelay: '0.45s' }} />
        </div>

        {/* PATH AREA ────────────────────────────────────────── */}
        <div className="pg-path-zone">
          <div className="pg-path-row">
            {slots.map((slot, i) => (
              <Fragment key={i}>
                {/* Connector between slots */}
                {i > 0 && (
                  <div
                    className={`pg-path-join${isFlowing || isCorrect ? ' pg-flowing' : ''}`}
                    style={{ animationDelay: `${0.75 + (i - 0.5) * 0.32}s` }}
                  />
                )}
                <PathSlot
                  slot={slot}
                  operator={operators[i]}
                  mode={mode}
                  isReady={selIdx !== null && !slot && gameState === 'playing'}
                  isFlowing={isFlowing || isCorrect}
                  isHinted={slot?.pipeIdx === hintPipeIdx}
                  flowDelay={`${0.75 + i * 0.32}s`}
                  onSlotClick={() => handleSlotClick(i)}
                  onOpToggle={() => handleOpToggle(i)}
                />
              </Fragment>
            ))}
          </div>

          {/* Live expression readout */}
          <div className={`pg-readout ${!allFilled ? 'pg-readout-dim' : isMatch ? 'pg-readout-ok' : 'pg-readout-miss'}`}>
            {puzzle.start}
            {slots.map((s, i) => (
              <Fragment key={i}>
                <span className="pg-ro-op">{operators[i]}</span>
                <span className={`pg-ro-val ${s ? '' : 'pg-ro-empty'}`}>
                  {s ? s.value : '?'}
                </span>
              </Fragment>
            ))}
            <span className="pg-ro-eq"> = </span>
            <strong className="pg-ro-result">
              {allFilled ? liveResult : '?'}
            </strong>
            {isMatch && <span className="pg-ro-check"> ✓</span>}
          </div>
        </div>

        {/* Vertical connector up from bottom pipe */}
        <div
          className={`pg-v-connector${isFlowing || isCorrect ? ' pg-flowing' : ''}`}
          style={{ animationDelay: `${0.75 + (nPipes - 1) * 0.32 + 0.32}s` }}
        />

        {/* BOTTOM PIPE ──────────────────────────────────────── */}
        <div
          className={`pg-h-pipe pg-bottom-pipe${isFlowing || isCorrect ? ' pg-flowing' : ''}`}
          style={{ animationDelay: `${0.75 + nPipes * 0.32 + 0.4}s` }}
        >
          <span className="pg-bolt pg-bolt-l" />
          <div className="pg-pipe-body-fill" />
          {/* Target badge */}
          <div className="pg-target-badge">
            <span className="pg-badge-label">TARGET</span>
            <span className="pg-badge-num">{puzzle.target}</span>
          </div>
          {/* Drain opening (right end) */}
          <div className="pg-drain">
            <span className="pg-drain-icon">▼</span>
          </div>
          <span className="pg-bolt pg-bolt-r" />
        </div>

      </div>{/* end pg-game-wrap */}

      {/* ── Wrong message ── */}
      {wrongMsg && (
        <div className="pg-wrong-banner">{wrongMsg}</div>
      )}

      {/* ── Action buttons ── */}
      <div className="pg-actions">
        <button className="pg-btn pg-btn-reset" onClick={handleReset}>
          ⟲ Reset
        </button>
        <button className="pg-btn pg-btn-hint" onClick={handleHint} disabled={gameState !== 'playing'}>
          💡 Hint
        </button>
        <button
          className={`pg-btn pg-btn-valve ${valveState === 'ready' ? 'pg-btn-valve-ready' : ''}`}
          onClick={handleValve}
          disabled={!allFilled || gameState !== 'playing'}
        >
          🔧 Open Valve
        </button>
      </div>

      {/* ── Pipe tray ── */}
      <div className="pg-tray-zone">
        <p className="pg-tray-label">
          {selIdx !== null
            ? `Pipe ${puzzle.pipes[selIdx]} selected — tap a slot`
            : 'Tap a pipe to pick it up'}
        </p>
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

      {/* ── Success overlay ── */}
      {isCorrect && (
        <div className="pg-overlay">
          <div className="pg-success-card">
            <div className="pg-success-icon">💧</div>
            <h2 className="pg-success-title">Water's flowing!</h2>
            <p className="pg-success-expr">
              {puzzle.start}
              {slots.map((s, i) => ` ${operators[i]} ${s?.value ?? '?'}`).join('')}
              {` = `}<strong>{puzzle.target}</strong>
            </p>
            {hintsUsed === 0 && (
              <p className="pg-success-bonus">No hints used — bonus points!</p>
            )}
            <div className="pg-success-btns">
              <button className="pg-btn pg-btn-next" onClick={handleNext}>
                Next Level →
              </button>
              <button className="pg-btn pg-btn-reset" onClick={handleReset}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PipesGame
