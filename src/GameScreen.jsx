<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react'
import './GameScreen.css'
import straightPipe from './widgets/straight-pipe.png'

function GameScreen() {
  const [pipeGoal, setPipeGoal] = useState({ target: 24, subtract: 4 })
  const [availablePipes] = useState([
    { id: 1, value: 8, label: '8', color: '#4ECDC4' },
    { id: 2, value: 5, label: '5', color: '#95E1D3' },
    { id: 3, value: 4, label: '4', color: '#F38181' },
    { id: 4, value: 3, label: '3', color: '#AA96DA' }
  ])
  const [placedPipes, setPlacedPipes] = useState([])
  const [draggedPipe, setDraggedPipe] = useState(null)
  const [dropZoneHover, setDropZoneHover] = useState(false)
  const [history, setHistory] = useState([])
  const [showInstructions, setShowInstructions] = useState(true)
  const [feedback, setFeedback] = useState({ show: false, message: '', type: '' })
  const [rotationAngle, setRotationAngle] = useState(0)
  const [showRotationHint, setShowRotationHint] = useState(false)

  const targetValue = pipeGoal.target - pipeGoal.subtract
  const currentSum = placedPipes.reduce((sum, pipe) => sum + pipe.value, 0)
  const isCorrect = currentSum === targetValue
  const canCheck = placedPipes.length > 0

  const handleDragStart = (pipe, e) => {
    setDraggedPipe(pipe)
    setShowRotationHint(true)
    e.dataTransfer.effectAllowed = 'copy'
    const dragImage = e.target.cloneNode(true)
    dragImage.style.opacity = '0.8'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 50, 50)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = () => {
    setDraggedPipe(null)
    setDropZoneHover(false)
    setShowRotationHint(false)
    setRotationAngle(0)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropZoneHover(true)
  }

  const handleDragLeave = () => {
    setDropZoneHover(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDropZoneHover(false)
    
    if (draggedPipe && !placedPipes.find(p => p.id === draggedPipe.id)) {
      const newPipe = { ...draggedPipe, rotation: rotationAngle }
      const newPlacedPipes = [...placedPipes, newPipe]
      setHistory([...history, placedPipes])
      setPlacedPipes(newPlacedPipes)
      
      const newSum = newPlacedPipes.reduce((sum, pipe) => sum + pipe.value, 0)
      if (newSum === targetValue) {
        showFeedback('Perfect! You reached the target!', 'success')
      } else if (newSum > targetValue) {
        showFeedback('Sum exceeds target. Try removing a pipe.', 'warning')
      } else {
        showFeedback(`Current sum: ${newSum}. Need ${targetValue - newSum} more.`, 'info')
      }
    }
    
    setDraggedPipe(null)
    setRotationAngle(0)
    setShowRotationHint(false)
  }

  const handleRemovePipe = (pipeId) => {
    setHistory([...history, placedPipes])
    const newPlacedPipes = placedPipes.filter(p => p.id !== pipeId)
    setPlacedPipes(newPlacedPipes)
    
    const newSum = newPlacedPipes.reduce((sum, pipe) => sum + pipe.value, 0)
    if (newSum === 0) {
      showFeedback('All pipes removed. Start building!', 'info')
    } else {
      showFeedback(`Current sum: ${newSum}. Need ${targetValue - newSum} more.`, 'info')
    }
  }

  const handleRotate = (e) => {
    if (e.key === 'r' || e.key === 'R') {
      setRotationAngle((prev) => (prev + 90) % 360)
    }
  }

  const handleCheck = () => {
    if (!canCheck) {
      showFeedback('Place at least one pipe first!', 'error')
      return
    }

    if (isCorrect) {
      showFeedback('🎉 Correct! You solved it!', 'success')
    } else {
      const difference = Math.abs(currentSum - targetValue)
      const direction = currentSum > targetValue ? 'too high' : 'too low'
      showFeedback(`Not quite! Sum is ${direction} by ${difference}.`, 'error')
    }
  }

  const handleUndo = () => {
    if (history.length > 0) {
      const previousState = history[history.length - 1]
      setPlacedPipes(previousState)
      setHistory(history.slice(0, -1))
      showFeedback('Undid last action', 'info')
    }
  }

  const handleReset = () => {
    setHistory([])
    setPlacedPipes([])
    setFeedback({ show: false, message: '', type: '' })
    showFeedback('Game reset! Drag pipes to the drop zone.', 'info')
  }

  const handleOpenValve = () => {
    if (isCorrect) {
      showFeedback('🚰 Valve opened! Water flows perfectly!', 'success')
    } else {
      showFeedback('❌ Cannot open valve! Pipes must equal target length.', 'error')
    }
  }

  const showFeedback = (message, type) => {
    setFeedback({ show: true, message, type })
    setTimeout(() => setFeedback({ show: false, message: '', type: '' }), 4000)
  }

  useEffect(() => {
    if (draggedPipe) {
      window.addEventListener('keydown', handleRotate)
      return () => window.removeEventListener('keydown', handleRotate)
    }
  }, [draggedPipe])

  useEffect(() => {
    if (placedPipes.length === 0) {
      setShowInstructions(true)
    } else {
      setShowInstructions(false)
    }
  }, [placedPipes])

  const generateRulerNumbers = () => {
    return Array.from({ length: 30 }, (_, i) => i + 1)
  }

  const getPipeEquation = () => {
    if (placedPipes.length === 0) {
      return '_ + _ + _ = _'
    }
    const values = placedPipes.map(p => p.value).join(' + ')
    return `${values} = ${currentSum}`
  }

  return (
    <div className="play-mode-container">
      <div className="main-play-area">
        {/* Context-Sensitive Instructions */}
        {showInstructions && (
          <div className="floating-instructions">
            <div className="instruction-content">
              <span className="instruction-icon">💡</span>
              <span>Drag pipes from above to the drop zone below. Press 'R' while dragging to rotate!</span>
            </div>
          </div>
        )}

        {/* Feedback Banner */}
        {feedback.show && (
          <div className={`feedback-banner feedback-${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {/* Top Section with Enhanced Hierarchy */}
        <div className="top-section">
          <div className="goal-display">
            <span className="pipe-length-label">Target Length:</span>
            <span className="pipe-goal-equation">
              {pipeGoal.target} - {pipeGoal.subtract} = <strong>{targetValue}</strong>
            </span>
          </div>
          <button 
            className={`check-button ${isCorrect ? 'correct' : ''} ${!canCheck ? 'disabled' : ''}`}
            onClick={handleCheck}
            disabled={!canCheck}
          >
            {isCorrect ? '✓ Correct!' : 'Check'}
          </button>
        </div>

        {/* Cognitive Offloading - Current Sum Display */}
        <div className="sum-display">
          <span className="sum-label">Current Sum:</span>
          <span className={`sum-value ${currentSum === targetValue ? 'correct' : currentSum > targetValue ? 'over' : 'under'}`}>
            {currentSum}
          </span>
          <span className="sum-difference">
            {currentSum === targetValue ? '🎯 Perfect!' : 
             currentSum === 0 ? '⬆️ Start adding pipes' :
             currentSum < targetValue ? `↑ Need ${targetValue - currentSum} more` : 
             `↓ ${currentSum - targetValue} too much`}
          </span>
        </div>

        {/* Available Pipes with Clear Affordances */}
        <div className="pipe-images-container">
          <div className="inventory-label">📦 Available Pipes (Drag me!)</div>
          <div className="pipes-grid">
            {availablePipes.map((pipe) => {
              const isUsed = placedPipes.find(p => p.id === pipe.id)
              return (
                <div
                  key={pipe.id}
                  className={`pipe-card ${isUsed ? 'used' : 'available'} ${draggedPipe?.id === pipe.id ? 'dragging' : ''}`}
                  draggable={!isUsed}
                  onDragStart={(e) => !isUsed && handleDragStart(pipe, e)}
                  onDragEnd={handleDragEnd}
                  style={{ 
                    borderColor: pipe.color,
                    backgroundColor: isUsed ? '#555' : pipe.color + '20'
                  }}
                >
                  <div className="pipe-visual" style={{ backgroundColor: pipe.color }}>
                    <span className="pipe-value">{pipe.label}</span>
                  </div>
                  <div className="pipe-meta">
                    <span className="pipe-length">Length: {pipe.value}</span>
                    {isUsed && <span className="used-badge">✓ In Use</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rotation Hint */}
        {showRotationHint && (
          <div className="rotation-hint">
            Press 'R' to rotate • Current: {rotationAngle}°
          </div>
        )}

        {/* Visual Divider with Better Contrast */}
        <div className="construction-zone-divider">
          <span className="zone-label">⬇️ CONSTRUCTION ZONE ⬇️</span>
        </div>

        {/* Enhanced Pipe Equation with Real Values */}
        <div className={`pipe-equation-section ${isCorrect ? 'correct' : ''}`}>
          <span className="equation-label">Your Equation:</span>
          <span className="pipe-equation-text">{getPipeEquation()}</span>
        </div>

        {/* Interactive Drop Zone with Strong Affordances */}
        <div 
          className={`drop-zone ${dropZoneHover ? 'hover' : ''} ${placedPipes.length > 0 ? 'has-pipes' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {placedPipes.length === 0 ? (
            <div className="drop-zone-placeholder">
              <span className="placeholder-icon">⬇️</span>
              <span>Drop pipes here to build</span>
            </div>
          ) : (
            <div className="placed-pipes-container">
              {placedPipes.map((pipe, index) => (
                <div 
                  key={pipe.id}
                  className="placed-pipe"
                  style={{ 
                    backgroundColor: pipe.color,
                    transform: `rotate(${pipe.rotation}deg)`
                  }}
                  onClick={() => handleRemovePipe(pipe.id)}
                  title="Click to remove"
                >
                  <span className="placed-pipe-value">{pipe.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visual Height Indicator */}
        <div className="height-indicator">
          <div className="height-bar">
            <div 
              className={`height-fill ${isCorrect ? 'correct' : ''}`}
              style={{ 
                height: `${Math.min((currentSum / targetValue) * 100, 100)}%`,
                backgroundColor: isCorrect ? '#00F90C' : currentSum > targetValue ? '#EE0000' : '#BDC700'
              }}
            >
              <span className="height-label">{currentSum}</span>
            </div>
            <div className="target-marker" style={{ bottom: '0%' }}>
              <span className="target-label">Target: {targetValue}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section with Ruler and Controls */}
        <div className="bottom-section">
          <div className="ruler-container">
            <div className="ruler-numbers">
              {generateRulerNumbers().map((num) => (
                <span 
                  key={num} 
                  className={`ruler-mark ${num === targetValue ? 'target' : ''}`}
                >
                  {num}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bottom-info">
            <button 
              className="control-button undo-button" 
              onClick={handleUndo}
              disabled={history.length === 0}
            >
              ↶ Undo
            </button>
            <button className="control-button reset-button" onClick={handleReset}>
              ⟲ Reset
            </button>
            <button 
              className={`control-button open-valve-button ${isCorrect ? 'enabled' : 'disabled'}`}
              onClick={handleOpenValve}
            >
              {isCorrect ? '🚰 Open Valve' : '🔒 Valve Locked'}
            </button>
          </div>
        </div>
=======
import { useState, useEffect } from 'react'
import './App.css'
import straightPipe from './widgets/straight-pipe.png'

const GRID_SIZE = 8

function GameScreen() {
  const [grid, setGrid] = useState([])
  const [selectedPipeType, setSelectedPipeType] = useState('straight')

  useEffect(() => {
    initializeGrid()
  }, [])

  const initializeGrid = () => {
    const newGrid = []
    for (let i = 0; i < GRID_SIZE; i++) {
      const row = []
      for (let j = 0; j < GRID_SIZE; j++) {
        row.push({
          type: 'empty',
          rotation: 0,
          connected: false
        })
      }
      newGrid.push(row)
    }
    setGrid(newGrid)
  }

  const checkConnections = () => {
    const newGrid = [...grid]
    
    // Reset all connections
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        newGrid[i][j].connected = false
      }
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
            if ((rotation === 0 || rotation === 180) && (leftRotation === 0 || leftRotation === 180)) {
              hasConnection = true
            }
          }
          
          if (j < GRID_SIZE - 1 && newGrid[i][j+1].type !== 'empty') {
            const rightRotation = newGrid[i][j+1].rotation
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

  const handleTileClick = (row, col) => {
    const newGrid = [...grid]
    const tile = newGrid[row][col]
    
    if (tile.type === 'empty') {
      // Place a pipe
      newGrid[row][col] = {
        type: selectedPipeType,
        rotation: 0,
        connected: false
      }
    } else {
      // Rotate existing pipe
      newGrid[row][col] = {
        ...tile,
        rotation: (tile.rotation + 90) % 360
      }
    }
    
    setGrid(newGrid)
    
    // Check connections after placing/rotating
    setTimeout(() => checkConnections(), 100)
  }

  const getPipeImage = (type) => {
    switch(type) {
      case 'straight':
        return straightPipe
      default:
        return null
    }
  }

  return (
    <div className="app">
      <h1>Pipe Grid Game</h1>
      
      <div className="controls">
        <button 
          className={`pipe-btn ${selectedPipeType === 'straight' ? 'selected' : ''}`}
          onClick={() => setSelectedPipeType('straight')}
        >
          Straight Pipe
        </button>
        <button onClick={initializeGrid}>
          Clear Grid
        </button>
      </div>

      <div className="game-board">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            {row.map((tile, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`tile ${tile.connected ? 'connected' : ''}`}
                onClick={() => handleTileClick(rowIndex, colIndex)}
              >
                {tile.type !== 'empty' && (
                  <img
                    src={getPipeImage(tile.type)}
                    alt={tile.type}
                    className="pipe"
                    style={{ transform: `rotate(${tile.rotation}deg)` }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
>>>>>>> parent of 6938c2f (Merge branch 'main' of https://github.com/sterzoutt/4474-Project)
      </div>
    </div>
  )
}

export default GameScreen