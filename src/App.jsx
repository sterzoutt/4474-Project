import { useState } from 'react'
import './App.css'
import OptionsScreen from './OptionsScreen'
import PipesGame     from './mathpipes/PipesGame'

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu')
  const [gameMode] = useState(
    () => localStorage.getItem('gameMode') || 'addition'
  )

  const handlePlay    = () => setCurrentScreen('game')
  const handleOptions = () => setCurrentScreen('options')
  const handleQuit    = () => {
    window.close()
    if (!window.closed) window.location.href = 'about:blank'
  }

  if (currentScreen === 'options') {
    return <OptionsScreen onBack={() => setCurrentScreen('menu')} />
  }

  if (currentScreen === 'game') {
    return <PipesGame mode={gameMode} onBack={() => setCurrentScreen('menu')} />
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
