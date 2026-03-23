import { useState, useMemo, useEffect, useCallback, Fragment } from 'react'
import { getPuzzle }                        from './puzzleGenerator'
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

// ── Ruler pipe (top = start, bottom = target) ────────────────────────────────
// Shows numbers 5 10 15 ... embedded inside the pipe, with a coloured
// marker-badge floating above (start) or below (target) at the exact value.
function MeasurePipe({ markedVal, maxTick, markerLabel, isStart, isFlowing, flowDelay }) {
  // Labels every 5 units
  const labels = []
  for (let v = 5; v <= maxTick; v += 5) labels.push(v)

  const pct = (v) => `${(v / maxTick) * 100}%`

  return (
    <div
      className={`pg-mpipe ${isStart ? 'pg-mpipe-top' : 'pg-mpipe-bottom'} ${isFlowing ? 'pg-flowing' : ''}`}
      style={flowDelay ? { animationDelay: flowDelay } : undefined}
    >
      {/* ── Pipe barrel with embedded scale ── */}
      <div className="pg-mpipe-barrel">

        {/* Tick marks + labels */}
        {labels.map((v) => (
          <div key={v} className="pg-scale-mark" style={{ left: pct(v) }}>
            <div className="pg-scale-tick" />
            <span className="pg-scale-num">{v}</span>
          </div>
        ))}

        {/* Highlighted marker pin */}
        <div
          className={`pg-scale-pin ${isStart ? 'pg-pin-start' : 'pg-pin-target'}`}
          style={{ left: pct(markedVal) }}
        />

        {/* Pipe shine overlay */}
        <div className="pg-mpipe-shine" />
      </div>

      {/* ── Floating value badge ── */}
      <div
        className={`pg-mmarker ${isStart ? 'pg-mmarker-top' : 'pg-mmarker-bot'}`}
        style={{ left: pct(markedVal) }}
      >
        {isStart && <div className="pg-mmarker-arrow pg-arrow-down" />}
        <div className={`pg-mmarker-badge ${isStart ? 'pg-mbadge-start' : 'pg-mbadge-target'}`}>
          <span className="pg-mmarker-label">{markerLabel}</span>
          <span className="pg-mmarker-val">{markedVal}</span>
        </div>
        {!isStart && <div className="pg-mmarker-arrow pg-arrow-up" />}
      </div>
    </div>
  )
}

// ── Valve SVG ────────────────────────────────────────────────────────────────
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
      {/* Handle bar */}
      <rect x="29" y="1" width="14" height="18" rx="5" fill={P.rim} />
      {/* Outer rim */}
      <circle cx="36" cy="36" r="30" fill={P.fill} stroke={P.rim} strokeWidth="5" />
      {/* Spokes */}
      <line x1="36" y1="10"  x2="36" y2="62" stroke={P.spoke} strokeWidth="5"  strokeLinecap="round" />
      <line x1="10"  y1="36" x2="62" y2="36" stroke={P.spoke} strokeWidth="5"  strokeLinecap="round" />
      <line x1="15" y1="15" x2="57" y2="57"  stroke={P.spoke} strokeWidth="3"  strokeLinecap="round" />
      <line x1="57" y1="15" x2="15" y2="57"  stroke={P.spoke} strokeWidth="3"  strokeLinecap="round" />
      {/* Centre hub */}
      <circle cx="36" cy="36" r="9"  fill={P.hub}  stroke={P.rim} strokeWidth="2" />
      {/* Shine */}
      <ellipse cx="25" cy="23" rx="6" ry="4" fill="rgba(255,255,255,0.13)" />
    </svg>
  )
}

// ── Single path slot (pipe segment in the active path) ───────────────────────
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
      {/* Flange caps */}
      <span className="pg-flange" />
      <div className="pg-pslot-body">
        {filled ? (
          <>
            <button
              className={`pg-optag ${mode === 'mixed' ? 'pg-optag-click' : ''}`}
              onClick={(e) => { e.stopPropagation(); onOpToggle() }}
              disabled={mode !== 'mixed'}
            >
              {operator}
            </button>
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

// ── Vertical connector segment ────────────────────────────────────────────────
function VConn({ isFlowing, delay }) {
  return (
    <div
      className={`pg-vconn ${isFlowing ? 'pg-flowing' : ''}`}
      style={delay ? { animationDelay: delay } : undefined}
    />
  )
}

// ── Main game scene ───────────────────────────────────────────────────────────
function PipesGame({ mode, onBack }) {
  const [levelIndex, setLevelIndex] = useState(0)
  const [score,      setScore]      = useState(0)

  const difficulty = diffForLevel(levelIndex)
  const puzzle     = useMemo(
    () => getPuzzle(difficulty, mode, levelIndex),
    [difficulty, mode, levelIndex]
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

  // Reset when puzzle changes
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

  // Ruler max — round up to nearest 5, leave some headroom
  const maxTick = useMemo(() => {
    const raw = Math.max(puzzle.start, puzzle.target, 15) + 5
    return Math.ceil(raw / 5) * 5
  }, [puzzle])

  // Valve ready state
  useEffect(() => {
    if (gameState !== 'playing') return
    setValveState(isMatch ? 'ready' : 'locked')
  }, [isMatch, gameState])

  // Flowing → correct
  useEffect(() => {
    if (!isFlowing) return
    const t = setTimeout(() => setGameState('correct'), 2800)
    return () => clearTimeout(t)
  }, [isFlowing])

  // Interactions (identical to before — only presentation changed)
  const handleTrayClick = useCallback((i) => {
    if (gameState !== 'playing') return
    const inSlot = slots.findIndex((s) => s?.pipeIdx === i)
    if (inSlot >= 0) {
      const next = [...slots]; next[inSlot] = null
      setSlots(next); setSelIdx(null); return
    }
    setSelIdx((p) => (p === i ? null : i))
  }, [gameState, slots])

  const handleSlotClick = useCallback((i) => {
    if (gameState !== 'playing') return
    if (slots[i] !== null) {
      const next = [...slots]; next[i] = null; setSlots(next); return
    }
    if (selIdx === null) return
    const next = [...slots]
    next[i] = { pipeIdx: selIdx, value: puzzle.pipes[selIdx] }
    setSlots(next); setSelIdx(null)
  }, [gameState, slots, selIdx, puzzle.pipes])

  const handleOpToggle = useCallback((i) => {
    if (gameState !== 'playing' || mode !== 'mixed') return
    const next = [...operators]
    next[i] = next[i] === '+' ? '-' : '+'
    setOperators(next)
  }, [gameState, mode, operators])

  const handleValve = useCallback(() => {
    if (gameState !== 'playing') return
    if (isMatch) {
      setValveState('open')
      setGameState('flowing')
      setScore((s) => s + (hintsUsed === 0 ? 15 : 10))
    } else if (allFilled) {
      setValveState('failed')
      const diff = liveResult - puzzle.target
      setWrongMsg(diff > 0
        ? `Too high by ${diff} — try different pipes!`
        : `Too low by ${Math.abs(diff)} — try different pipes!`
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
    const sol  = puzzle._solution
    const step = hintStep % sol.length
    const hVal = sol[step].val
    const idx  = puzzle.pipes.findIndex((v, i) => v === hVal && !usedIdx.includes(i))
    setHintPipeIdx(idx >= 0 ? idx : null)
    setHintStep((s) => s + 1)
    setHintsUsed((h) => h + 1)
    setTimeout(() => setHintPipeIdx(null), 2400)
  }, [gameState, puzzle, hintStep, usedIdx])

  const handleNext = useCallback(() => setLevelIndex((l) => l + 1), [])

  const trayState = (i) => {
    if (usedIdx.includes(i)) return 'used'
    if (i === hintPipeIdx)   return 'hint'
    if (i === selIdx)        return 'selected'
    return ''
  }

  // Flow timing
  const flowAt = (n) => `${0.4 + n * 0.3}s`
  const nSlots = puzzle.slotCount

  const modePill = { addition: '+ Addition', subtraction: '− Subtraction', mixed: '± Mixed' }[mode]

  return (
    <div className="pg-scene">

      {/* ── Header ── */}
      <header className="pg-header">
        <button className="pg-back-btn" onClick={onBack}>&#8592; Menu</button>
        <span className="pg-mode-pill">{modePill}</span>
        <div className="pg-stats">
          <span className="pg-level">Lv {levelIndex + 1}</span>
          <span className="pg-score">⭐ {score}</span>
        </div>
      </header>

      {/* ── Scene content ── */}
      <div className="pg-content">

        {/* TOP: measurement pipe + valve */}
        <div className="pg-top-row">
          <div className="pg-top-pipe-wrap">
            <MeasurePipe
              markedVal={puzzle.start}
              maxTick={maxTick}
              markerLabel="START"
              isStart={true}
              isFlowing={isFlowing || isCorrect}
              flowDelay={flowAt(0)}
            />
          </div>
          <div className="pg-valve-block">
            <Valve state={valveState} onClick={handleValve} />
            <span className="pg-valve-lbl">
              {valveState === 'ready'  && '▶ Open!'}
              {valveState === 'locked' && 'Locked'}
              {valveState === 'open'   && 'Flowing'}
              {valveState === 'failed' && '✕ Wrong'}
            </span>
          </div>
        </div>

        {/* Connector down from top pipe */}
        <VConn isFlowing={isFlowing || isCorrect} delay={flowAt(1)} />

        {/* ── Path / slot row ── */}
        <div className="pg-path-zone">

          {/* Instruction strip */}
          <p className="pg-path-tip">
            {selIdx !== null
              ? `Pipe ${puzzle.pipes[selIdx]} selected — tap a slot below`
              : gameState === 'playing'
                ? 'Tap a pipe piece below, then tap an empty slot'
                : null}
          </p>

          <div className="pg-path-row">
            {slots.map((slot, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <div
                    className={`pg-pjoin ${isFlowing || isCorrect ? 'pg-flowing' : ''}`}
                    style={{ animationDelay: flowAt(1.5 + i * 0.3) }}
                  />
                )}
                <PathSlot
                  slot={slot}
                  operator={operators[i]}
                  mode={mode}
                  isReady={selIdx !== null && !slot && gameState === 'playing'}
                  isFlowing={isFlowing || isCorrect}
                  isHinted={slot?.pipeIdx === hintPipeIdx}
                  flowDelay={flowAt(1.5 + i * 0.3)}
                  onSlotClick={() => handleSlotClick(i)}
                  onOpToggle={() => handleOpToggle(i)}
                />
              </Fragment>
            ))}
          </div>

          {/* Live equation strip — styled like a gauge label on the pipe */}
          <div className={`pg-equation-strip ${
            !allFilled ? '' : isMatch ? 'pg-eq-match' : 'pg-eq-miss'
          }`}>
            <span className="pg-eq-start">{puzzle.start}</span>
            {slots.map((s, i) => (
              <Fragment key={i}>
                <span className="pg-eq-op">{operators[i]}</span>
                <span className={`pg-eq-val ${s ? 'pg-eq-placed' : 'pg-eq-blank'}`}>
                  {s ? s.value : '?'}
                </span>
              </Fragment>
            ))}
            <span className="pg-eq-eq"> = </span>
            <strong className="pg-eq-result">{allFilled ? liveResult : '?'}</strong>
            {isMatch && <span className="pg-eq-ok"> ✓</span>}
          </div>
        </div>

        {/* Connector up from path to bottom pipe */}
        <VConn
          isFlowing={isFlowing || isCorrect}
          delay={flowAt(1.5 + nSlots * 0.3 + 0.3)}
        />

        {/* BOTTOM: measurement pipe */}
        <MeasurePipe
          markedVal={puzzle.target}
          maxTick={maxTick}
          markerLabel="TARGET"
          isStart={false}
          isFlowing={isFlowing || isCorrect}
          flowDelay={flowAt(1.5 + nSlots * 0.3 + 0.6)}
        />

      </div>{/* end pg-content */}

      {/* Wrong answer banner */}
      {wrongMsg && <div className="pg-wrong-banner">{wrongMsg}</div>}

      {/* ── Action buttons ── */}
      <div className="pg-actions">
        <button className="pg-btn pg-btn-reset" onClick={handleReset}>⟲ Reset</button>
        <button className="pg-btn pg-btn-hint"  onClick={handleHint} disabled={gameState !== 'playing'}>💡 Hint</button>
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
        <div className="pg-tray-header">
          <span className="pg-tray-title">Available Pipes</span>
          <span className="pg-tray-sub">
            {puzzle.pipes.length - usedIdx.length} remaining
          </span>
        </div>
        <div className="pg-tray">
          {puzzle.pipes.map((val, i) => (
            <TrayPipe key={i} value={val} state={trayState(i)} onClick={() => handleTrayClick(i)} />
          ))}
        </div>
      </div>

      {/* ── Success overlay ── */}
      {isCorrect && (
        <div className="pg-overlay">
          <div className="pg-success-card">
            <div className="pg-success-icon">💧</div>
            <h2 className="pg-success-title">Water's Flowing!</h2>
            <p className="pg-success-expr">
              {puzzle.start}
              {slots.map((s, i) => ` ${operators[i]} ${s?.value ?? '?'}`).join('')}
              {` = `}<strong>{puzzle.target}</strong>
            </p>
            {hintsUsed === 0 && <p className="pg-success-bonus">No hints — bonus points!</p>}
            <div className="pg-success-btns">
              <button className="pg-btn pg-btn-next"  onClick={handleNext}>Next Level →</button>
              <button className="pg-btn pg-btn-reset" onClick={handleReset}>Play Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PipesGame
