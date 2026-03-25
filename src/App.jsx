import { useState } from 'react'
import './App.css'
import OptionsScreen from './OptionsScreen'
import ModeSelectScreen from './ModeSelectScreen'
import PipesGame from './mathpipes/PipesGame'
import {
  loadSession,
  clearSession,
  isSessionLoadable,
  GAME_MODE_STORAGE_KEY,
} from './mathpipes/pipesSession'

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu')
  const [gameMode, setGameMode] = useState(
    () => localStorage.getItem(GAME_MODE_STORAGE_KEY) || 'addition'
  )
  const [gameBootSession, setGameBootSession] = useState(null)

  const handlePlay = () => setCurrentScreen('modeSelect')
  const handleOptions = () => setCurrentScreen('options')
  const handleQuit = () => {
    window.close()
    if (!window.closed) window.location.href = 'about:blank'
  }

  const handleEnterGame = ({ resume, mode }) => {
    if (resume) {
      if (!isSessionLoadable()) return
      const s = loadSession()
      if (!s) return
      setGameMode(s.mode)
      localStorage.setItem(GAME_MODE_STORAGE_KEY, s.mode)
      setGameBootSession(s)
    } else {
      clearSession()
      setGameMode(mode)
      localStorage.setItem(GAME_MODE_STORAGE_KEY, mode)
      setGameBootSession(null)
    }
    setCurrentScreen('game')
  }

  if (currentScreen === 'options') {
    return <OptionsScreen onBack={() => setCurrentScreen('menu')} />
  }

  if (currentScreen === 'modeSelect') {
    return (
      <ModeSelectScreen
        onBack={() => setCurrentScreen('menu')}
        onEnterGame={handleEnterGame}
      />
    )
  }

  if (currentScreen === 'game') {
    return (
      <PipesGame
        mode={gameMode}
        initialSession={gameBootSession}
        onBack={() => {
          setCurrentScreen('menu')
          setGameBootSession(null)
        }}
        onAbandon={() => {
          clearSession()
          setCurrentScreen('menu')
          setGameBootSession(null)
        }}
      />
    )
  }

  return (
    <div className="app home-screen">
      <div className="menu-container">
        <h1 className="game-title">Fitting Pipes</h1>
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
