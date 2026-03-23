import { useState } from 'react'
import './App.css'
import OptionsScreen from './OptionsScreen'
import PipesGame     from './mathpipes/PipesGame'

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu')
  // Mode persists in localStorage so it survives a refresh
  const [gameMode, setGameMode] = useState(
    () => localStorage.getItem('gameMode') || 'addition'
  )

  const handlePlay = () => setCurrentScreen('game')

  const handleOptions = () => setCurrentScreen('options')

  const handleQuit = () => {
    window.close()
    if (!window.closed) window.location.href = 'about:blank'
  }

  const handleModeSave = (mode) => {
    localStorage.setItem('gameMode', mode)
    setGameMode(mode)
    setCurrentScreen('menu')
  }

  if (currentScreen === 'options') {
    return (
      <OptionsScreen
        currentMode={gameMode}
        onSave={handleModeSave}
        onBack={() => setCurrentScreen('menu')}
      />
    )
  }

  if (currentScreen === 'game') {
    return <PipesGame mode={gameMode} onBack={() => setCurrentScreen('menu')} />
  }

  // ── Main menu ──────────────────────────────────────────────
  const modeLabel = { addition: '+ Addition', subtraction: '− Subtraction', mixed: '± Mixed' }

  return (
    <div className="app home-screen">
      <div className="menu-container">
        <h1 className="game-title">Fitting Pipes</h1>

        <p className="menu-mode-hint">
          Mode: <span className="menu-mode-val">{modeLabel[gameMode]}</span>
        </p>

        <div className="menu-buttons">
          <button className="menu-btn" onClick={handlePlay}>PLAY</button>
          <button className="menu-btn" onClick={handleOptions}>OPTIONS</button>
          <button className="menu-btn" onClick={handleQuit}>QUIT</button>
        </div>
      </div>
    </div>
  )
}

export default App
