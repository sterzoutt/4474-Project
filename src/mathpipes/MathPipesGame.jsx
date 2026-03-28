import { useState, useMemo, useEffect, useCallback } from 'react'
import { getPuzzle }                                  from './puzzleGenerator'
import { evaluate, isComplete, checkAnswer }          from './evaluator'
import './MathPipes.css'

const MODE_LABEL = { addition: 'Addition  +', subtraction: 'Subtraction  −', mixed: 'Mixed  ±' }
const MODE_COLOR = { addition: '#4ea64e',     subtraction: '#c0392b',          mixed: '#2980b9' }

// ─── helpers ─────────────────────────────────────────────────────────────────

function defaultOperators(count, mode) {
  const op = mode === 'subtraction' ? '-' : '+'
  return Array(count).fill(op)
}

// ─── main component ──────────────────────────────────────────────────────────

function MathPipesGame({ mode, difficulty, onBack }) {
  const [levelIndex, setLevelIndex] = useState(0)
  const [score,      setScore]      = useState(0)

  const puzzle = useMemo(
    () => getPuzzle(difficulty, mode, levelIndex),
    [difficulty, mode, levelIndex]
  )

  // slots[i] = { pipeIdx, value } | null
  const [slots,          setSlots]          = useState(() => Array(puzzle.slotCount).fill(null))
  const [operators,      setOperators]      = useState(() => defaultOperators(puzzle.slotCount, mode))
  const [selectedIdx,    setSelectedIdx]    = useState(null)   // pipe bank index
  const [gameState,      setGameState]      = useState('playing') // 'playing' | 'correct' | 'wrong'
  const [shaking,        setShaking]        = useState(false)
  const [hintPipeIdx,    setHintPipeIdx]    = useState(null)
  const [hintStep,       setHintStep]       = useState(0)
  const [wrongMsg,       setWrongMsg]       = useState('')
  const [hintsUsed,      setHintsUsed]      = useState(0)

  // Reset everything when the puzzle changes
  useEffect(() => {
    setSlots(Array(puzzle.slotCount).fill(null))
    setOperators(defaultOperators(puzzle.slotCount, mode))
    setSelectedIdx(null)
    setGameState('playing')
    setShaking(false)
    setHintPipeIdx(null)
    setHintStep(0)
    setWrongMsg('')
  }, [puzzle, mode])

  // ─── derived state ──────────────────────────────────────────────────────

  const usedPipeIndices = slots.filter(Boolean).map((s) => s.pipeIdx)
  const slotValues      = slots.map((s) => (s ? s.value : null))
  const liveResult      = evaluate(puzzle.start, slotValues, operators)
  const allFilled       = isComplete(slotValues)
  const resultIsCorrect = allFilled && liveResult === puzzle.target

  // ─── interactions ────────────────────────────────────────────────────────

  const handlePipeClick = useCallback((pipeIdx) => {
    if (gameState !== 'playing') return

    // If this pipe is already in a slot, pull it back out
    const existingSlot = slots.findIndex((s) => s?.pipeIdx === pipeIdx)
    if (existingSlot >= 0) {
      const next = [...slots]
      next[existingSlot] = null
      setSlots(next)
      setSelectedIdx(null)
      return
    }

    // Toggle selection
    setSelectedIdx((prev) => (prev === pipeIdx ? null : pipeIdx))
  }, [gameState, slots])

  const handleSlotClick = useCallback((slotIdx) => {
    if (gameState !== 'playing') return

    if (slots[slotIdx] !== null) {
      // Remove pipe from slot → back to bank
      const next = [...slots]
      next[slotIdx] = null
      setSlots(next)
      return
    }

    if (selectedIdx === null) return

    // Place selected pipe into this slot
    const next = [...slots]
    next[slotIdx] = { pipeIdx: selectedIdx, value: puzzle.pipes[selectedIdx] }
    setSlots(next)
    setSelectedIdx(null)
  }, [gameState, slots, selectedIdx, puzzle.pipes])

  const handleOperatorToggle = useCallback((slotIdx) => {
    if (gameState !== 'playing' || mode !== 'mixed') return
    const next = [...operators]
    next[slotIdx] = next[slotIdx] === '+' ? '-' : '+'
    setOperators(next)
  }, [gameState, mode, operators])

  const handleCheck = useCallback(() => {
    if (!allFilled) return
    if (checkAnswer(puzzle.start, slotValues, operators, puzzle.target)) {
      setGameState('correct')
      const bonus = hintsUsed === 0 ? 15 : 10
      setScore((s) => s + bonus)
    } else {
      setGameState('wrong')
      setShaking(true)
      const diff = liveResult - puzzle.target
      setWrongMsg(
        diff > 0
          ? `Too high by ${diff}! Try different pipes or operators.`
          : `Too low by ${Math.abs(diff)}! Try different pipes or operators.`
      )
      setTimeout(() => {
        setShaking(false)
        setGameState('playing')
        setWrongMsg('')
      }, 800)
    }
  }, [allFilled, puzzle, slotValues, operators, hintsUsed, liveResult])

  const handleReset = useCallback(() => {
    setSlots(Array(puzzle.slotCount).fill(null))
    setOperators(defaultOperators(puzzle.slotCount, mode))
    setSelectedIdx(null)
    setGameState('playing')
    setShaking(false)
    setHintPipeIdx(null)
    setHintStep(0)
    setWrongMsg('')
  }, [puzzle.slotCount, mode])

  const handleHint = useCallback(() => {
    if (gameState !== 'playing') return
    const sol     = puzzle._solution
    const step    = hintStep % sol.length
    const hintVal = sol[step].val

    // Find first bank pipe matching this value that isn't placed yet
    const idx = puzzle.pipes.findIndex(
      (v, i) => v === hintVal && !usedPipeIndices.includes(i)
    )
    setHintPipeIdx(idx >= 0 ? idx : null)
    setHintStep((s) => s + 1)
    setHintsUsed((h) => h + 1)
    setTimeout(() => setHintPipeIdx(null), 2200)
  }, [gameState, puzzle, hintStep, usedPipeIndices])

  const handleNext = useCallback(() => {
    setLevelIndex((l) => l + 1)
  }, [])

  // ─── class helpers ───────────────────────────────────────────────────────

  const pipeClass = (pipeIdx) => {
    if (usedPipeIndices.includes(pipeIdx)) return 'mp-pipe mp-pipe-used'
    if (pipeIdx === hintPipeIdx)           return 'mp-pipe mp-pipe-hint'
    if (pipeIdx === selectedIdx)           return 'mp-pipe mp-pipe-selected'
    return 'mp-pipe'
  }

  const slotClass = (slotIdx) => {
    const filled  = slots[slotIdx] !== null
    const canDrop = selectedIdx !== null && !filled
    return [
      'mp-slot',
      filled  ? 'mp-slot-filled'  : '',
      canDrop ? 'mp-slot-ready'   : '',
    ].filter(Boolean).join(' ')
  }

  const resultClass = () => {
    if (!allFilled) return 'mp-result-chip'
    return 'mp-result-chip ' + (resultIsCorrect ? 'mp-result-correct' : 'mp-result-wrong')
  }

  // ─── expression parts for live display ──────────────────────────────────

  const exprParts = useMemo(() => {
    const parts = []
    parts.push({ type: 'num',    text: String(puzzle.start) })
    for (let i = 0; i < puzzle.slotCount; i++) {
      parts.push({ type: 'op',  text: operators[i], slotIdx: i })
      parts.push({ type: slots[i] ? 'placed' : 'blank', text: slots[i] ? String(slots[i].value) : '?' })
    }
    parts.push({ type: 'eq', text: '=' })
    // Right side is always the goal; styling reflects whether the left equals it when complete
    parts.push({
      type: allFilled ? (resultIsCorrect ? 'res-ok' : 'res-no') : 'num',
      text: String(puzzle.target),
    })
    return parts
  }, [puzzle, operators, slots, allFilled, resultIsCorrect])

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div className="mp-screen">

      {/* ── Header ── */}
      <div className="mp-header">
        <button className="mp-back-btn" onClick={onBack}>&#8592;</button>
        <div className="mp-mode-badge" style={{ background: MODE_COLOR[mode] }}>
          {MODE_LABEL[mode]}
        </div>
        <div className="mp-header-right">
          <span className="mp-level-txt">Level {levelIndex + 1}</span>
          <span className="mp-score-txt">Score: {score}</span>
        </div>
      </div>

      {/* ── Target ── */}
      <div className="mp-target-banner">
        <span className="mp-target-label">Target</span>
        <span className="mp-target-number">{puzzle.target}</span>
      </div>

      {/* ── Live expression display ── */}
      <div className={`mp-expr-display ${shaking ? 'mp-shake' : ''}`}>
        {exprParts.map((p, i) => (
          <span key={i} className={`mp-expr-${p.type}`}>
            {/* In mixed mode, operators are clickable */}
            {p.type === 'op' && mode === 'mixed'
              ? <button
                  className="mp-expr-op-btn"
                  onClick={() => handleOperatorToggle(p.slotIdx)}
                  title="Click to toggle + / −"
                >
                  {p.text}
                </button>
              : p.text
            }
          </span>
        ))}
      </div>

      {/* ── Slot row ── */}
      <div className="mp-slot-row">
        {/* Starting chip */}
        <div className="mp-start-chip">{puzzle.start}</div>

        {slots.map((slot, i) => (
          <div key={i} className="mp-slot-group">
            {/* Operator button */}
            <button
              className={`mp-op-btn ${mode !== 'mixed' ? 'mp-op-locked' : ''}`}
              onClick={() => handleOperatorToggle(i)}
              title={mode === 'mixed' ? 'Click to toggle' : `Fixed: ${operators[i]}`}
            >
              {operators[i]}
            </button>

            {/* Slot */}
            <div className={slotClass(i)} onClick={() => handleSlotClick(i)}>
              {slot
                ? <span className="mp-slot-val">{slot.value}</span>
                : <span className="mp-slot-ph">?</span>
              }
            </div>
          </div>
        ))}

        {/* Equals + result */}
        <span className="mp-eq-sym">=</span>
        <div className={resultClass()} title="Goal — build the left side to match this">
          {puzzle.target}
        </div>
      </div>

      {/* ── Wrong-answer feedback ── */}
      {wrongMsg && (
        <div className="mp-wrong-msg">{wrongMsg}</div>
      )}

      {/* ── Pipe bank ── */}
      <div className="mp-bank-area">
        <p className="mp-bank-label">
          {selectedIdx !== null
            ? `Pipe ${puzzle.pipes[selectedIdx]} selected — click a slot to place it`
            : 'Click a pipe to select it'}
        </p>
        <div className="mp-bank">
          {puzzle.pipes.map((val, i) => (
            <button
              key={i}
              className={pipeClass(i)}
              onClick={() => handlePipeClick(i)}
              disabled={usedPipeIndices.includes(i)}
              title={usedPipeIndices.includes(i) ? 'Already placed' : `Pipe ${val}`}
            >
              <span className="mp-pipe-end" />
              <span className="mp-pipe-body">{val}</span>
              <span className="mp-pipe-end" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="mp-actions">
        <button className="mp-btn mp-btn-reset" onClick={handleReset}>
          ⟲ Reset
        </button>
        <button className="mp-btn mp-btn-hint" onClick={handleHint} disabled={gameState !== 'playing'}>
          💡 Hint
        </button>
        <button
          className={`mp-btn mp-btn-check ${!allFilled ? 'mp-btn-dim' : ''}`}
          onClick={handleCheck}
          disabled={!allFilled || gameState !== 'playing'}
        >
          ✓ Check
        </button>
      </div>

      {/* ── Success overlay ── */}
      {gameState === 'correct' && (
        <div className="mp-overlay">
          <div className="mp-success-card">
            <div className="mp-success-emoji">🎉</div>
            <h2 className="mp-success-title">Correct!</h2>
            <p className="mp-success-expr">
              {puzzle.start}
              {slots.map((s, i) => ` ${operators[i]} ${s?.value ?? '?'}`).join('')}
              {` = ${puzzle.target}`}
            </p>
            {hintsUsed === 0 && (
              <p className="mp-success-bonus">No hints used — +5 bonus!</p>
            )}
            <div className="mp-success-btns">
              <button className="mp-btn mp-btn-next" onClick={handleNext}>
                Next Puzzle →
              </button>
              <button className="mp-btn mp-btn-reset" onClick={handleReset}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MathPipesGame
