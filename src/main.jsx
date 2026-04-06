import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GameAudioProvider } from './audio/GameAudioProvider.jsx'

/* Render application */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameAudioProvider>
      <App />
    </GameAudioProvider>
  </StrictMode>,
)
