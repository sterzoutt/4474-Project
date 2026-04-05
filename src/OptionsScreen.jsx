import { useState } from 'react'
import './OptionsScreen.css'
import { useGameAudio } from './audio/GameAudioProvider.jsx'
import {
  getDefaultGameSettings,
  loadGameSettings,
  saveGameSettings,
} from './audio/audioSettings'

function OptionsScreen({ onBack }) {
  const { playUiClick } = useGameAudio()

  const [tempSettings, setTempSettings] = useState(() => loadGameSettings())

  const handleDifficultyChange = (difficulty) => {
    playUiClick()
    setTempSettings({ ...tempSettings, difficulty })
  }

  const handleMuteToggle = () => {
    playUiClick()
    setTempSettings({ ...tempSettings, audioMuted: !tempSettings.audioMuted })
  }

  const handleSfxVolumeChange = (e) => {
    setTempSettings({ ...tempSettings, sfxVolume: parseInt(e.target.value, 10) })
  }

  const handleMusicVolumeChange = (e) => {
    setTempSettings({ ...tempSettings, musicVolume: parseInt(e.target.value, 10) })
  }

  const handleSave = () => {
    playUiClick()
    saveGameSettings(tempSettings)
    alert('Settings saved!')
  }

  const handleReset = () => {
    playUiClick()
    const d = getDefaultGameSettings()
    setTempSettings(d)
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

          <div className="audio-control audio-control--mute">
            <label className="audio-label" htmlFor="mute-all-toggle">
              Mute all
            </label>
            <button
              id="mute-all-toggle"
              type="button"
              className={`toggle-btn ${tempSettings.audioMuted ? 'off' : 'on'}`}
              onClick={handleMuteToggle}
              aria-pressed={tempSettings.audioMuted}
            >
              <span className="toggle-off">MUTED</span>
              <span className="toggle-on">ON</span>
            </button>
            <p className="audio-hint">
              Sliders keep your levels; mute silences music and sound effects until you turn it back on.
            </p>
          </div>

          <div className="audio-control">
            <label className="audio-label" htmlFor="sfx-volume">
              SFX
            </label>
            <div className="volume-control volume-control--full">
              <span className="volume-icon">🔊</span>
              <input
                id="sfx-volume"
                type="range"
                min="0"
                max="100"
                value={tempSettings.sfxVolume}
                onChange={handleSfxVolumeChange}
                className="volume-slider"
              />
              <span className="volume-value">{tempSettings.sfxVolume}</span>
            </div>
          </div>

          <div className="audio-control">
            <label className="audio-label" htmlFor="music-volume">
              Music
            </label>
            <div className="volume-control volume-control--full">
              <span className="volume-icon">🎵</span>
              <input
                id="music-volume"
                type="range"
                min="0"
                max="100"
                value={tempSettings.musicVolume}
                onChange={handleMusicVolumeChange}
                className="volume-slider"
              />
              <span className="volume-value">{tempSettings.musicVolume}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="action-buttons">
          <button className="action-btn save-btn" onClick={handleSave}>
            Save
          </button>
          <button className="action-btn reset-btn" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

export default OptionsScreen
