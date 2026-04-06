/**
 * HowToPlayModal — animated "How to Play" overlay.
 *
 * Accepts an optional `mode` prop:
 *   - Provided (from inside the game): shows only that mode's content, no tabs.
 *   - Not provided (from main menu): shows three tabs so users can explore all modes.
 *
 * This keeps the explanation consistent whether the player is reading before playing
 * or pausing mid-game to check the rules for their specific mode.
 *
 * Progressive disclosure: this overlay is secondary information — never auto-shown.
 * The player opens it via "HOW TO PLAY" on the menu or "ⓘ HOW" in the game tray.
 */

import { useEffect, useRef, useState } from 'react'
import './HowToPlayModal.css'

// ── Per-mode configuration ────────────────────────────────────────────────────
// Each entry drives both the animated demo and the written step descriptions.
const MODE_CONFIG = {
  addition: {
    label: '+ Addition',
    accentClass: 'hiw-accent--add',
    start: 6,
    pipes: [3, 5, 2],       // [slot1 pipe, slot2 pipe, distractor]
    ops: ['+', '+'],         // fixed operators for slots
    target: 14,              // 6 + 3 + 5 = 14
    operatorNote:
      'All operators are fixed to <strong>+</strong>. Every pipe you place adds to the running total.',
    mixedToggleNote: null,
    exampleEq: '6 + 3 + 5 = 14',
    targetLabel: '14',
  },
  subtraction: {
    label: '− Subtraction',
    accentClass: 'hiw-accent--sub',
    start: 20,
    pipes: [3, 5, 2],
    ops: ['−', '−'],
    target: 12,              // 20 − 3 − 5 = 12
    operatorNote:
      'All operators are fixed to <strong>−</strong>. Every pipe you place subtracts from the running total.',
    mixedToggleNote: null,
    exampleEq: '20 − 3 − 5 = 12',
    targetLabel: '12',
  },
  mixed: {
    label: '± Mixed',
    accentClass: 'hiw-accent--mix',
    start: 6,
    pipes: [8, 3, 5],
    ops: ['+', '−'],         // phase 3 shows the toggle from + to −
    target: 11,              // 6 + 8 − 3 = 11
    operatorNote:
      'Operators start as <strong>+</strong>. Tap any placed pipe\'s operator badge to toggle it between <strong>+</strong> and <strong>−</strong>.',
    mixedToggleNote:
      'The animation shows the operator changing — that\'s the Mixed mode special mechanic.',
    exampleEq: '6 + 8 − 3 = 11',
    targetLabel: '11',
  },
}

const DEMO_PHASES   = 5
const DEMO_STEP_MS  = 2100

// Caption per phase — keyed by mode
const PHASE_CAPTIONS = {
  addition:    ['Pick a pipe from the tray', 'Drop it into the highlighted slot', 'See the equation update live', 'Fill all slots — valve turns ready', 'Open the valve! ✔'],
  subtraction: ['Pick a pipe from the tray', 'Drop it into the highlighted slot', 'Each pipe subtracts from the total', 'Fill all slots — valve turns ready', 'Open the valve! ✔'],
  mixed:       ['Pick a pipe from the tray', 'Drop it into the highlighted slot', 'Tap the operator to change + ↔ −', 'Equation matches target — valve ready', 'Open the valve! ✔'],
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DemoPipe({ value, active, used }) {
  return (
    <div className={`hiw-chip${active ? ' hiw-chip--active' : ''}${used ? ' hiw-chip--used' : ''}`}>
      {value}
    </div>
  )
}

function DemoSlot({ value, op, highlighted, filled, showOpToggle }) {
  return (
    <div className={`hiw-slot${highlighted ? ' hiw-slot--highlight' : ''}${filled ? ' hiw-slot--filled' : ''}${showOpToggle ? ' hiw-slot--toggle' : ''}`}>
      {filled && <span className="hiw-slot-op">{op}</span>}
      {value !== null ? value : '?'}
    </div>
  )
}

// ── Animated demo (mode-aware) ────────────────────────────────────────────────
function AnimatedDemo({ mode }) {
  const cfg = MODE_CONFIG[mode]
  const [phase, setPhase] = useState(0)
  const timerRef = useRef(null)

  // Reset phase when mode tab changes
  useEffect(() => {
    setPhase(0)
  }, [mode])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPhase((p) => (p + 1) % DEMO_PHASES)
    }, DEMO_STEP_MS)
    return () => clearInterval(timerRef.current)
  }, [mode])

  // Derive visual state from phase
  const selectedPipeIdx = (phase === 0) ? 0 : (phase === 1) ? 1 : null
  const slot1Filled  = phase >= 1
  const slot2Filled  = phase >= 2
  const valveReady   = phase >= 3
  const valveOpen    = phase === 4

  // Mixed: operator on slot2 toggles at phase 2 (shows the mechanic)
  const slot2Op = (mode === 'mixed' && phase >= 2) ? '−' : cfg.ops[1]

  // Equation string
  const op1 = cfg.ops[0]
  const op2 = slot2Op

  const running1 = slot1Filled ? apply(cfg.start, op1, cfg.pipes[0]) : null
  const running2 = slot1Filled && slot2Filled ? apply(running1, op2, cfg.pipes[1]) : null
  const equalsTarget = running2 === cfg.target

  const eqDisplay = buildEqDisplay(cfg.start, slot1Filled ? cfg.pipes[0] : null, op1,
                                                slot2Filled ? cfg.pipes[1] : null, op2,
                                                running2 ?? running1 ?? cfg.start)

  return (
    <div className="hiw-demo">
      {/* Tray */}
      <div className="hiw-demo-section">
        <span className="hiw-demo-label">PIPE TRAY</span>
        <div className="hiw-demo-tray">
          {cfg.pipes.map((val, i) => (
            <DemoPipe
              key={i}
              value={val}
              active={selectedPipeIdx === i}
              used={(slot1Filled && i === 0) || (slot2Filled && i === 1)}
            />
          ))}
        </div>
      </div>

      {/* Arrow */}
      <div className={`hiw-demo-arrow${(phase === 1 || phase === 2) ? ' hiw-demo-arrow--active' : ''}`}>↓</div>

      {/* Board */}
      <div className="hiw-demo-section">
        <span className="hiw-demo-label">BOARD</span>
        <div className="hiw-demo-board">
          <div className="hiw-demo-start">START: {cfg.start}</div>
          <DemoSlot
            value={slot1Filled ? cfg.pipes[0] : null}
            op={op1}
            highlighted={phase === 1}
            filled={slot1Filled}
          />
          <DemoSlot
            value={slot2Filled ? cfg.pipes[1] : null}
            op={op2}
            highlighted={phase === 2}
            filled={slot2Filled}
            showOpToggle={mode === 'mixed' && phase === 2}
          />
          <div className="hiw-demo-target">TARGET: {cfg.target}</div>
        </div>
      </div>

      {/* Equation */}
      <div className="hiw-demo-section">
        <span className="hiw-demo-label">EQUATION</span>
        <div className={`hiw-demo-eq${equalsTarget ? ' hiw-demo-eq--match' : ''}`}>
          {eqDisplay}
        </div>
      </div>

      {/* Valve */}
      <div className="hiw-demo-section">
        <span className="hiw-demo-label">VALVE</span>
        <div className={`hiw-demo-valve${valveReady ? ' hiw-demo-valve--ready' : ''}${valveOpen ? ' hiw-demo-valve--open' : ''}`}>
          <div className="hiw-demo-valve-icon" />
          <span className="hiw-demo-valve-status">
            {valveOpen ? 'OPEN ✔' : valveReady ? 'READY' : 'LOCKED'}
          </span>
        </div>
      </div>

      {/* Caption */}
      <div className="hiw-demo-caption">{PHASE_CAPTIONS[mode][phase]}</div>
    </div>
  )
}

function apply(val, op, pipe) {
  return op === '−' || op === '-' ? val - pipe : val + pipe
}

function buildEqDisplay(start, pipe1, op1, pipe2, op2, result) {
  const fmt = (op) => (op === '−' || op === '-') ? '−' : '+'
  let s = String(start)
  if (pipe1 !== null) s += ` ${fmt(op1)} ${pipe1}`
  else s += ` ${fmt(op1)} ?`
  if (pipe2 !== null) s += ` ${fmt(op2)} ${pipe2}`
  else s += ` ${fmt(op2)} ?`
  return <>{s} = <strong>{result}</strong></>
}

// ── Mode-specific written content ─────────────────────────────────────────────
function ModeSteps({ mode }) {
  const cfg = MODE_CONFIG[mode]
  return (
    <>
      <div className="hiw-steps">
        <h3 className="hiw-steps-title">Step by step</h3>
        <ol className="hiw-steps-list">
          <li>
            <strong>See the target.</strong> The ribbon at the top shows the number to reach
            — e.g. <em>TARGET = {cfg.targetLabel}</em>.
          </li>
          <li>
            <strong>Pick a pipe.</strong> Tap or drag any number chip from the tray.
            It highlights to confirm selection.
          </li>
          <li>
            <strong>Place it in a slot.</strong> Tap the glowing board row.
            Slots fill <em>top to bottom only</em> — you cannot skip a row.
          </li>
          <li>
            <strong>Operators: </strong>
            <span dangerouslySetInnerHTML={{ __html: cfg.operatorNote }} />
            {cfg.mixedToggleNote && (
              <span className="hiw-sub-note"> {cfg.mixedToggleNote}</span>
            )}
          </li>
          <li>
            <strong>Open the valve.</strong> When all slots are filled and the equation
            equals the target, the valve turns <span className="hiw-green">green</span>.
            Click it to score and advance — e.g. <em>{cfg.exampleEq}</em>.
          </li>
        </ol>
      </div>

      <div className="hiw-tips">
        <h3 className="hiw-tips-title">Tips for this mode</h3>
        <ul className="hiw-tips-list">
          {mode === 'addition' && (
            <li>All pipes add — look for numbers that sum to the gap between <strong>START</strong> and <strong>TARGET</strong>.</li>
          )}
          {mode === 'subtraction' && (
            <li>All pipes subtract — think of it as: start with <strong>{cfg.start}</strong> and remove enough to land on <strong>{cfg.targetLabel}</strong>.</li>
          )}
          {mode === 'mixed' && (
            <li>Try placing all pipes first, then toggle operators until the equation balances.</li>
          )}
          <li>Tap <strong>? HINT</strong> to highlight a useful pipe. Using hints costs 5 pts on that puzzle.</li>
          <li>Tap <strong>⟳ RESET</strong> to clear all placed pipes and try again.</li>
          <li>Your progress saves automatically — you can leave and continue any time.</li>
        </ul>
      </div>
    </>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

/**
 * @param {{ onClose: () => void, mode?: 'addition' | 'subtraction' | 'mixed' }} props
 *
 * `mode` is optional:
 *   - Passed from PipesGame: shows only that mode (no tabs)
 *   - Not passed (main menu): shows tabs so the player can browse all three modes
 */
export default function HowToPlayModal({ onClose, mode: forcedMode }) {
  // When no mode is forced (main menu), use tabs; default to 'addition'
  const [activeTab, setActiveTab] = useState(forcedMode ?? 'addition')
  const visibleMode = forcedMode ?? activeTab

  const cfg = MODE_CONFIG[visibleMode]

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus panel for accessibility
  const panelRef = useRef(null)
  useEffect(() => { panelRef.current?.focus() }, [])

  return (
    <div
      className="hiw-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`How to play Fitting Pipes${forcedMode ? ` — ${cfg.label}` : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`hiw-panel ${cfg.accentClass}`} ref={panelRef} tabIndex={-1}>

        {/* Header */}
        <div className="hiw-header">
          <h2 className="hiw-title">
            How to Play
            {forcedMode && <span className="hiw-title-mode"> — {cfg.label}</span>}
          </h2>
          <button type="button" className="hiw-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Mode tabs — only shown when opened from the main menu (no forcedMode) */}
        {!forcedMode && (
          <div className="hiw-tabs" role="tablist" aria-label="Game mode">
            {Object.entries(MODE_CONFIG).map(([key, c]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`hiw-tab${activeTab === key ? ' hiw-tab--active' : ''} hiw-tab--${key}`}
                onClick={() => setActiveTab(key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Animated visual — updates when tab or forcedMode changes */}
        <div className="hiw-visual-section">
          <p className="hiw-visual-heading">Watch the loop — one full puzzle cycle for <strong>{cfg.label}</strong>:</p>
          <AnimatedDemo key={visibleMode} mode={visibleMode} />
        </div>

        {/* Written steps + tips — mode-specific */}
        <ModeSteps mode={visibleMode} />

        <button type="button" className="hiw-got-it" onClick={onClose}>
          Got it — let me play!
        </button>

      </div>
    </div>
  )
}
