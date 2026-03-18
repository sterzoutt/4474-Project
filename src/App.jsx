import { useState } from 'react'
import './App.css'
import GameScreen from './GameScreen'

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu')

  const handlePlay = () => {
    console.log('Play clicked')
    setCurrentScreen('game')
  }

  const handleOptions = () => {
    console.log('Options clicked')
    // Will navigate to options screen later
  }

  const handleQuit = () => {
    console.log('Quit clicked')
    // Try to close the window/tab
    window.close()
    // If window.close() doesn't work (some browsers prevent it), navigate away
    if (!window.closed) {
      window.location.href = 'about:blank'
    }
  }

  // Render different screens based on currentScreen state
  if (currentScreen === 'game') {
    return (
      <div>
        <div className="game-header-nav">
          <button 
            className="back-btn"
            onClick={() => setCurrentScreen('menu')}
          >
            ← Back to Menu
          </button>
        </div>
        <GameScreen />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="menu-container">
        <h1 className="game-title">Fitting Pipes</h1>
        
        <div className="menu-buttons">
          <button className="menu-btn" onClick={handlePlay}>
            PLAY
          </button>
          <button className="menu-btn" onClick={handleOptions}>
            OPTIONS
          </button>
          <button className="menu-btn" onClick={handleQuit}>
            QUIT
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
