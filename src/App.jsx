import { useState } from 'react'
import './App.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu')

  const handlePlay = () => {
    console.log('Play clicked')
    // Will navigate to game screen later
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
