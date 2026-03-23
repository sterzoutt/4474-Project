import { useState } from 'react'
import './OptionsScreen.css'

const MODES = [
  {
    key: 'addition',
    symbol: '+',
    title: 'Addition',
    desc: 'Build a path using only addition',
    color: '#4ea64e',
    glow: 'rgba(78,166,78,0.4)',
  },
  {
    key: 'subtraction',
    symbol: '−',
    title: 'Subtraction',
    desc: 'Build a path using only subtraction',
    color: '#c0392b',
    glow: 'rgba(192,57,43,0.4)',
  },
  {
    key: 'mixed',
    symbol: '±',
    title: 'Mixed',
    desc: 'Toggle each pipe between + and −',
    color: '#2980b9',
    glow: 'rgba(41,128,185,0.4)',
  },
]

function OptionsScreen({ currentMode, onSave, onBack }) {
  const [selected, setSelected] = useState(currentMode)

  const handleSelect = (key) => {
    setSelected(key)
    localStorage.setItem('gameMode', key)
  }

  return (
    <div className="opt-screen">
      <button className="opt-back-btn" onClick={onBack}>&#8592; Back</button>

      <div className="opt-content">
        <div className="opt-header">
          <h1 className="opt-title">Game Mode</h1>
          <p className="opt-subtitle">How do your pipes connect?</p>
        </div>

        <div className="opt-mode-grid">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`opt-mode-card ${selected === m.key ? 'active' : ''}`}
              style={{ '--card-color': m.color, '--card-glow': m.glow }}
              onClick={() => handleSelect(m.key)}
            >
              <span className="opt-mode-symbol">{m.symbol}</span>
              <span className="opt-mode-title">{m.title}</span>
              <span className="opt-mode-desc">{m.desc}</span>
              {selected === m.key && <span className="opt-mode-check">✓</span>}
            </button>
          ))}
        </div>

        <button className="opt-save-btn" onClick={() => onSave(selected)}>
          Save &amp; Play
        </button>
      </div>
    </div>
  )
}

export default OptionsScreen
