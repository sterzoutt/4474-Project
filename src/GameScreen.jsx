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
          
          // Check top
          if (i > 0 && newGrid[i-1][j].type !== 'empty') {
            const topRotation = newGrid[i-1][j].rotation
            if ((rotation === 0 || rotation === 180) && (topRotation === 0 || topRotation === 180)) {
              hasConnection = true
            }
          }
          
          // Check bottom  
          if (i < GRID_SIZE - 1 && newGrid[i+1][j].type !== 'empty') {
            const bottomRotation = newGrid[i+1][j].rotation
            if ((rotation === 0 || rotation === 180) && (bottomRotation === 0 || bottomRotation === 180)) {
              hasConnection = true
            }
          }
          
          // Check left
          if (j > 0 && newGrid[i][j-1].type !== 'empty') {
            const leftRotation = newGrid[i][j-1].rotation
            if ((rotation === 90 || rotation === 270) && (leftRotation === 90 || leftRotation === 270)) {
              hasConnection = true
            }
          }
          
          // Check right
          if (j < GRID_SIZE - 1 && newGrid[i][j+1].type !== 'empty') {
            const rightRotation = newGrid[i][j+1].rotation
            if ((rotation === 90 || rotation === 270) && (rightRotation === 90 || rightRotation === 270)) {
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
      </div>
    </div>
  )
}

export default GameScreen
