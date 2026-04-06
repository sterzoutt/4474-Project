import {
  loadSession,
  isSessionLoadable,
  SESSION_QUESTION_COUNT,
} from './mathpipes/pipesSession'
import { puzzleTierShortLabel } from './audio/audioSettings'
import './ModeSelectScreen.css'

const MODE_LABEL = {
  addition: '+ Addition',
  subtraction: '− Subtraction',
  mixed: '± Mixed',
}

export default function ModeSelectScreen({ onBack, onEnterGame }) {
  const snapshot    = loadSession()
  const canContinue = isSessionLoadable()

  const saved = canContinue && snapshot ? snapshot : null

  return (
    <div className="app home-screen mode-select-screen">
      <button type="button" className="mode-select-back" onClick={onBack}>
        <span className="mode-select-back-icon">&#8592;</span> Menu
      </button>
      <div className="menu-container mode-select-inner">
        <h1 className="game-title mode-select-title">Before you play</h1>
        <p className="mode-select-hint">
          Pick a math type. Your run is saved automatically — continue anytime, or start a new game (that replaces the save).
        </p>

        {/* ── In-progress save ── */}
        <section className="mode-select-save-section" aria-label="Saved progress">
          <h2 className="mode-select-section-title">Current save</h2>
          {saved ? (
            <div className="mode-select-save-card">
              <div className="mode-select-save-row">
                <span className="mode-select-save-label">Mode</span>
                <span className="mode-select-save-val">{MODE_LABEL[saved.mode]}</span>
              </div>
              <div className="mode-select-save-row">
                <span className="mode-select-save-label">Progress</span>
                <span className="mode-select-save-val">
                  Question {saved.questionNum} / {SESSION_QUESTION_COUNT}
                </span>
              </div>
              <div className="mode-select-save-row">
                <span className="mode-select-save-label">Score so far</span>
                <span className="mode-select-save-val">
                  {typeof saved.score === 'number' ? saved.score : 0} pts
                </span>
              </div>
              <div className="mode-select-save-row">
                <span className="mode-select-save-label">Challenge</span>
                <span className="mode-select-save-val">
                  {puzzleTierShortLabel(saved.puzzleTier)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mode-select-save-empty">
              No saved game yet. Play once to create a save — it updates as you go.
            </p>
          )}
        </section>

        {/* ── Continue button — only for in-progress sessions ── */}
        {saved && (
          <button
            type="button"
            className="menu-btn mode-select-continue"
            onClick={() => onEnterGame({ resume: true })}
          >
            Continue saved game
          </button>
        )}

        <h2 className="mode-select-section-title mode-select-section-title--spaced">
          New game — choose type
        </h2>
        <div className="mode-select-grid">
          {['addition', 'subtraction', 'mixed'].map((m) => (
            <button
              key={m}
              type="button"
              className="menu-btn mode-select-new"
              onClick={() => onEnterGame({ resume: false, mode: m })}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
