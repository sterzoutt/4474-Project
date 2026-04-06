import { useState } from 'react'
import './OptionsScreen.css'
import { useGameAudio } from './audio/GameAudioProvider.jsx'
import {
  getDefaultGameSettings,
  loadGameSettings,
  saveGameSettings,
} from './audio/audioSettings'
import {
  loadKeyBindings,
  saveKeyBindings,
  getDefaultKeyBindings,
  BINDABLE_ACTIONS,
  displayKey,
} from './audio/keyBindings.js'

function OptionsScreen({ onBack }) {
  const { playUiClick } = useGameAudio()

  const [tempSettings, setTempSettings] = useState(() => loadGameSettings())

  // Key bindings — each action can be rebound; tempBindings holds unsaved edits
  const [tempBindings, setTempBindings] = useState(() => loadKeyBindings())
  // Which action is currently being rebound (waiting for a key press)
  const [rebindingAction, setRebindingAction] = useState(null)

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
    saveKeyBindings(tempBindings)
    alert('Settings saved!')
  }

  const handleReset = () => {
    playUiClick()
    setTempSettings(getDefaultGameSettings())
    setTempBindings(getDefaultKeyBindings())
  }

  // Start listening for a new key for the given action
  const handleStartRebind = (actionId) => {
    playUiClick()
    setRebindingAction(actionId)
  }

  // Capture the pressed key and assign it to the action being rebound
  const handleRebindKeyDown = (e) => {
    e.preventDefault()
    e.stopPropagation()

    const key = e.key

    // Ignore pure modifier presses
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(key)) return

    // Escape cancels rebinding without changing anything
    if (key === 'Escape') {
      setRebindingAction(null)
      return
    }

    // Reject Tab (used for pipe cycling — not rebindable to avoid focus traps)
    if (key === 'Tab') return

    setTempBindings((prev) => ({ ...prev, [rebindingAction]: key }))
    setRebindingAction(null)
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

        {/* Keyboard Shortcuts */}
        <div className="settings-section">
          <h2 className="section-title">Keyboard Shortcuts</h2>
          <p className="kb-hint-text">
            Click a key badge to rebind it. Press the new key, or Esc to cancel.
          </p>
          <div className="kb-bindings-list">
            {BINDABLE_ACTIONS.map((action) => (
              <div key={action.id} className="kb-binding-row">
                <div className="kb-binding-info">
                  <span className="kb-binding-label">{action.label}</span>
                  <span className="kb-binding-desc">{action.description}</span>
                </div>
                {rebindingAction === action.id ? (
                  /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
                  <div
                    className="kb-capture-box"
                    onKeyDown={handleRebindKeyDown}
                    tabIndex={0}
                    autoFocus
                    aria-label={`Press new key for ${action.label}`}
                  >
                    Press a key…
                  </div>
                ) : (
                  <button
                    type="button"
                    className="kb-key-badge"
                    onClick={() => handleStartRebind(action.id)}
                    title={`Click to rebind ${action.label}`}
                  >
                    {displayKey(tempBindings[action.id])}
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="kb-fixed-note">
            <strong>Fixed shortcuts (not rebindable):</strong>&nbsp;
            <kbd className="kb-fixed-key">1–9</kbd> select pipe by position &nbsp;·&nbsp;
            <kbd className="kb-fixed-key">Tab</kbd> cycle through available pipes &nbsp;·&nbsp;
            <kbd className="kb-fixed-key">Esc</kbd> back to menu confirmation
          </p>
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
