import { loadSession, isSessionLoadable } from './mathpipes/pipesSession'
import './ModeSelectScreen.css'

const MODE_LABEL = {
  addition: '+ Addition',
  subtraction: '− Subtraction',
  mixed: '± Mixed',
}

export default function ModeSelectScreen({ onBack, onEnterGame }) {
  const canContinue = isSessionLoadable()
  const saved = canContinue ? loadSession() : null

  return (
    <div className="app home-screen mode-select-screen">
      <button type="button" className="mode-select-back" onClick={onBack}>
        <span className="mode-select-back-icon">&#8592;</span> Menu
      </button>
      <div className="menu-container mode-select-inner">
        <h1 className="game-title mode-select-title">Choose mode</h1>
        <p className="mode-select-hint">New game clears any saved run for a fresh start. Continue resumes your last session.</p>

        {canContinue && saved && (
          <button
            type="button"
            className="menu-btn mode-select-continue"
            onClick={() => onEnterGame({ resume: true })}
          >
            Continue — {MODE_LABEL[saved.mode]} · Q{saved.questionNum}/8
          </button>
        )}

        <div className="mode-select-grid">
          {['addition', 'subtraction', 'mixed'].map((m) => (
            <button
              key={m}
              type="button"
              className="menu-btn mode-select-new"
              onClick={() => onEnterGame({ resume: false, mode: m })}
            >
              New game — {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
