import { useState } from 'react'
import './MathPipes.css'

const MODES = [
  { key: 'addition',    symbol: '+',  label: 'Addition',    desc: 'Only + allowed',    color: '#4ea64e', border: '#7bcf76' },
  { key: 'subtraction', symbol: '−',  label: 'Subtraction', desc: 'Only − allowed',    color: '#c0392b', border: '#e07070' },
  { key: 'mixed',       symbol: '±',  label: 'Mixed',       desc: 'You choose + or −', color: '#2980b9', border: '#6ab4e8' },
]

const DIFFICULTIES = [
  { key: 'easy',   label: 'Easy',   desc: '2 pipes · small numbers',    stars: 1 },
  { key: 'medium', label: 'Medium', desc: '3 pipes · bigger numbers',    stars: 2 },
  { key: 'hard',   label: 'Hard',   desc: '4 pipes · tight constraints', stars: 3 },
]

function MathPipesLevelSelect({ onPlay, onBack }) {
  const [mode, setMode]           = useState('addition')
  const [difficulty, setDifficulty] = useState('easy')

  return (
    <div className="mp-screen">
      <button className="mp-back-btn" onClick={onBack}>&#8592; Back</button>

      <div className="mp-ls-wrap">
        {/* Title */}
        <div className="mp-ls-header">
          <div className="mp-logo-pipes">
            <span className="mp-logo-pipe">3</span>
            <span className="mp-logo-op">+</span>
            <span className="mp-logo-pipe">5</span>
            <span className="mp-logo-eq">=</span>
            <span className="mp-logo-target">8</span>
          </div>
          <h1 className="mp-main-title">Math Pipes</h1>
          <p className="mp-main-subtitle">Place numbered pipes to hit the target!</p>
        </div>

        {/* Mode selector */}
        <div className="mp-ls-section">
          <h2 className="mp-ls-section-title">Choose Mode</h2>
          <div className="mp-ls-row">
            {MODES.map((m) => (
              <button
                key={m.key}
                className={`mp-choice-card ${mode === m.key ? 'active' : ''}`}
                style={{
                  '--card-color':  m.color,
                  '--card-border': m.border,
                }}
                onClick={() => setMode(m.key)}
              >
                <span className="mp-card-symbol">{m.symbol}</span>
                <span className="mp-card-label">{m.label}</span>
                <span className="mp-card-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty selector */}
        <div className="mp-ls-section">
          <h2 className="mp-ls-section-title">Choose Difficulty</h2>
          <div className="mp-ls-row">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                className={`mp-choice-card diff-card ${difficulty === d.key ? 'active' : ''}`}
                onClick={() => setDifficulty(d.key)}
              >
                <span className="mp-card-stars">
                  {'★'.repeat(d.stars)}
                  <span className="mp-card-stars-empty">{'★'.repeat(3 - d.stars)}</span>
                </span>
                <span className="mp-card-label">{d.label}</span>
                <span className="mp-card-desc">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="mp-play-btn" onClick={() => onPlay(mode, difficulty)}>
          Play!
        </button>
      </div>
    </div>
  )
}

export default MathPipesLevelSelect
