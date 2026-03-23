import { useState } from 'react'
import './OptionsScreen.css'

function OptionsScreen({ onBack }) {
  const loadSettings = () => {
    const saved = localStorage.getItem('gameSettings')
    if (saved) return JSON.parse(saved)
    return {
      difficulty: 'Normal',
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 80,
      musicVolume: 80,
    }
  }

  const [settings,     setSettings]     = useState(loadSettings)
  const [tempSettings, setTempSettings] = useState(loadSettings)

  const handleDifficultyChange  = (difficulty) => setTempSettings({ ...tempSettings, difficulty })
  const handleSoundToggle       = () => setTempSettings({ ...tempSettings, soundEnabled: !tempSettings.soundEnabled })
  const handleMusicToggle       = () => setTempSettings({ ...tempSettings, musicEnabled: !tempSettings.musicEnabled })
  const handleSoundVolumeChange = (e) => setTempSettings({ ...tempSettings, soundVolume: parseInt(e.target.value) })
  const handleMusicVolumeChange = (e) => setTempSettings({ ...tempSettings, musicVolume: parseInt(e.target.value) })

  const handleSave = () => {
    localStorage.setItem('gameSettings', JSON.stringify(tempSettings))
    setSettings(tempSettings)
    alert('Settings saved!')
  }

  const handleReset = () => {
    setTempSettings({
      difficulty: 'Normal',
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 80,
      musicVolume: 80,
    })
  }

  return (
    <div className="options-screen">
      <button className="back-button" onClick={onBack}>
        <span className="back-icon">&#8592;</span> Back
      </button>

      <div className="settings-header">
        <h1 className="settings-title">SETTINGS</h1>
      </div>

      <div className="settings-panel">
        <div className="panel-screw top-left"></div>
        <div className="panel-screw top-right"></div>
        <div className="panel-screw bottom-left"></div>
        <div className="panel-screw bottom-right"></div>

        {/* Difficulty */}
        <div className="settings-section">
          <h2 className="section-title">Difficulty</h2>
          <div className="difficulty-buttons">
            {['Easy', 'Normal', 'Hard'].map((d) => (
              <button
                key={d}
                className={`difficulty-btn ${tempSettings.difficulty === d ? 'active' : ''}`}
                onClick={() => handleDifficultyChange(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Audio */}
        <div className="settings-section">
          <h2 className="section-title">Audio</h2>

          {/* Sound */}
          <div className="audio-control">
            <label className="audio-label">Sound</label>
            <button
              className={`toggle-btn ${tempSettings.soundEnabled ? 'on' : 'off'}`}
              onClick={handleSoundToggle}
            >
              <span className="toggle-off">OFF</span>
              <span className="toggle-on">ON</span>
            </button>
            <div className="volume-control">
              <span className="volume-icon">🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={tempSettings.soundVolume}
                onChange={handleSoundVolumeChange}
                className="volume-slider"
                disabled={!tempSettings.soundEnabled}
              />
              <span className="volume-value">{tempSettings.soundVolume}</span>
            </div>
          </div>

          {/* Music */}
          <div className="audio-control">
            <label className="audio-label">Music</label>
            <button
              className={`toggle-btn ${tempSettings.musicEnabled ? 'on' : 'off'}`}
              onClick={handleMusicToggle}
            >
              <span className="toggle-off">OFF</span>
              <span className="toggle-on">ON</span>
            </button>
            <div className="volume-control">
              <span className="volume-icon">🎵</span>
              <input
                type="range"
                min="0"
                max="100"
                value={tempSettings.musicVolume}
                onChange={handleMusicVolumeChange}
                className="volume-slider"
                disabled={!tempSettings.musicEnabled}
              />
              <span className="volume-value">{tempSettings.musicVolume}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="action-buttons">
          <button className="action-btn save-btn" onClick={handleSave}>Save</button>
          <button className="action-btn reset-btn" onClick={handleReset}>Reset</button>
        </div>
      </div>
    </div>
  )
}

export default OptionsScreen
