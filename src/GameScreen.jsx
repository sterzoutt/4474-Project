import { useState, useEffect } from 'react'
import './GameScreen.css'
import straightPipe from './widgets/straight-pipe.png'

function GameScreen() {
  const [pipeGoal, setPipeGoal] = useState({ target: 24, subtract: 4 })
  const [selectedPipes, setSelectedPipes] = useState([])
  const [history, setHistory] = useState([])

  const handleCheck = () => {
    const result = pipeGoal.target - pipeGoal.subtract
    console.log('Check result:', result)
    // Add your check logic here
  }

  const handleUndo = () => {
    if (history.length > 0) {
      const newHistory = [...history]
      newHistory.pop()
      setHistory(newHistory)
      console.log('Undo action')
    }
    
    // Check top-to-bottom and left-to-right connections
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newGrid[i][j].type !== 'empty') {
          const rotation = newGrid[i][j].rotation
          
          // Check if pipe connects to neighbors
          let hasConnection = false
          
          // Check top (this pipe needs to be vertical, neighbor needs to be vertical)
          if (i > 0 && newGrid[i-1][j].type !== 'empty') {
            const topRotation = newGrid[i-1][j].rotation
            // Both pipes are vertical (90° or 270°)
            if ((rotation === 90 || rotation === 270) && (topRotation === 90 || topRotation === 270)) {
              hasConnection = true
            }
          }
          
          // Check bottom (this pipe needs to be vertical, neighbor needs to be vertical)
          if (i < GRID_SIZE - 1 && newGrid[i+1][j].type !== 'empty') {
            const bottomRotation = newGrid[i+1][j].rotation
            // Both pipes are vertical (90° or 270°)
            if ((rotation === 90 || rotation === 270) && (bottomRotation === 90 || bottomRotation === 270)) {
              hasConnection = true
            }
          }
          
          // Check left (this pipe needs to be horizontal, neighbor needs to be horizontal)
          if (j > 0 && newGrid[i][j-1].type !== 'empty') {
            const leftRotation = newGrid[i][j-1].rotation
            // Both pipes are horizontal (0° or 180°)
            if ((rotation === 0 || rotation === 180) && (leftRotation === 0 || leftRotation === 180)) {
              hasConnection = true
            }
          }
          
          if (j < GRID_SIZE - 1 && newGrid[i][j+1].type !== 'empty') {
            const rightRotation = newGrid[i][j+1].rotation
            // Both pipes are horizontal (0° or 180°)
            if ((rotation === 0 || rotation === 180) && (rightRotation === 0 || rightRotation === 180)) {
              hasConnection = true
            }
          }
          
          newGrid[i][j].connected = hasConnection
        }
      }
    }
    
    setGrid(newGrid)
  }

  const handleReset = () => {
    setSelectedPipes([])
    setHistory([])
    console.log('Reset game')
  }

  const handleOpenValve = () => {
    console.log('Open valve')
    // Add your valve opening logic here
  }

  const generateRulerNumbers = () => {
    return Array.from({ length: 30 }, (_, i) => i + 1).join(' ')
  }

  return (
    <div className="play-mode-container">
      <div className="main-play-area">
        {/* Top Section */}
        <div className="top-section">
          <span className="pipe-length-label">Pipe Length Goal :</span>
          <span className="pipe-goal-equation">
            {pipeGoal.target} - {pipeGoal.subtract} = _
          </span>
          <button className="check-button" onClick={handleCheck}>
            Check
          </button>
        </div>

        {/* Pipe Images Container */}
        <div className="pipe-images-container">
          <div className="pipe-image pipe-image-1" 
               style={{ backgroundImage: 'url(image.png)' }}
               onClick={() => console.log('Pipe 1 selected')}>
          </div>
          <div className="pipe-image pipe-image-2" 
               style={{ backgroundImage: 'url(image.png)' }}
               onClick={() => console.log('Pipe 2 selected')}>
          </div>
          <div className="pipe-image pipe-image-3" 
               style={{ backgroundImage: 'url(image.png)' }}
               onClick={() => console.log('Pipe 3 selected')}>
          </div>
          <div className="pipe-image pipe-image-4" 
               style={{ backgroundImage: 'url(image.png)' }}
               onClick={() => console.log('Pipe 4 selected')}>
          </div>
        </div>

        {/* Divider Line */}
        <hr className="divider-line" />

        {/* Pipe Equation Section */}
        <div className="pipe-equation-section">
          <span className="pipe-equation-text">Pipe Equation: _ + _ + _ = _</span>
        </div>

        {/* Pipe Display */}
        <div className="pipe-display" style={{ backgroundImage: 'url(image.png)' }}></div>

        {/* Bottom Section */}
        <div className="bottom-section">
          <div className="ruler-numbers">
            {generateRulerNumbers()}
          </div>
          
          <div className="bottom-info">
            <button className="control-button undo-button" onClick={handleUndo}>
              [Undo]
            </button>
            <button className="control-button reset-button" onClick={handleReset}>
              [Reset]
            </button>
            <button className="control-button open-valve-button" onClick={handleOpenValve}>
              [Open Valve]
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameScreen