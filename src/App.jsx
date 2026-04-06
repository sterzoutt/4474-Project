import { useState } from 'react'
import './App.css'
import { useGameAudio } from './audio/GameAudioProvider.jsx'
import OptionsScreen from './OptionsScreen'
import ModeSelectScreen from './ModeSelectScreen'
import PipesGame from './mathpipes/PipesGame'
import HowToPlayModal from './components/HowToPlayModal'
import {
  loadSession,
  clearSession,
  isSessionLoadable,
  GAME_MODE_STORAGE_KEY,
} from './mathpipes/pipesSession'

function App() {
  const { playUiClick } = useGameAudio()
  const [currentScreen, setCurrentScreen] = useState('menu')
  const [gameMode, setGameMode] = useState(
    () => localStorage.getItem(GAME_MODE_STORAGE_KEY) || 'addition'
  )
  const [gameBootSession, setGameBootSession] = useState(null)

  // Progressive disclosure: "How to Play" is secondary information — hidden until requested
  const [showHowToPlay, setShowHowToPlay] = useState(false)

  const handlePlay = () => {
    playUiClick()
    setCurrentScreen('modeSelect')
  }
  const handleOptions = () => {
    playUiClick()
    setCurrentScreen('options')
  }
  const handleHowToPlay = () => {
    playUiClick()
    setShowHowToPlay(true)
  }
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
    return (
      <OptionsScreen
        onBack={() => {
          playUiClick()
          setCurrentScreen('menu')
        }}
      />
    )
  }

  if (currentScreen === 'modeSelect') {
    return (
      <ModeSelectScreen
        onBack={() => {
          playUiClick()
          setCurrentScreen('menu')
        }}
        onEnterGame={(payload) => {
          playUiClick()
          handleEnterGame(payload)
        }}
      />
    )
  }

  if (currentScreen === 'game') {
    return (
      <PipesGame
        mode={gameMode}
        initialSession={gameBootSession}
        onBack={() => {
          playUiClick()
          setCurrentScreen('menu')
          setGameBootSession(null)
        }}
        onPlayAgain={() => {
          // Session is already cleared by EndScreen before this is called.
          // Go directly to mode select so the player can pick a new game.
          playUiClick()
          setGameBootSession(null)
          setCurrentScreen('modeSelect')
        }}
        onAbandon={() => {
          playUiClick()
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

        <p className="menu-tagline">Build equations with pipes. Open the valve to score.</p>

        <div className="menu-buttons">
          <button className="menu-btn" onClick={handlePlay}>PLAY</button>

          {/* Progressive disclosure: HOW TO PLAY reveals the full ruleset only when asked */}
          <button className="menu-btn menu-btn--secondary" onClick={handleHowToPlay}>
            HOW TO PLAY
          </button>

          <button className="menu-btn menu-btn--secondary" onClick={handleOptions}>OPTIONS</button>
          <button
            className="menu-btn menu-btn--quit"
            onClick={() => {
              playUiClick()
              handleQuit()
            }}
          >
            QUIT
          </button>
        </div>
      </div>

      {/* Secondary information layer — only rendered when player asks */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}
    </div>
  )
}

export default App
