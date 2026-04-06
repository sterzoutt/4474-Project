import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import {
  AUDIO_URLS,
  getAudioSnapshot,
  subscribeGameSettings,
} from './audioSettings'

const GameAudioContext = createContext(null)

function effectiveMusicVol(snapshot) {
  if (snapshot.audioMuted) return 0
  return Math.min(1, Math.max(0, snapshot.musicVolume / 100))
}

function effectiveSfxVol(snapshot) {
  if (snapshot.audioMuted) return 0
  return Math.min(1, Math.max(0, snapshot.sfxVolume / 100))
}

export function GameAudioProvider({ children }) {
  const bgRef = useRef(null)
  const sfxRef = useRef({ correct: null, wrong: null, uiClick: null })
  const unlockedRef = useRef(false)

  const syncVolumes = useCallback(() => {
    const snap = getAudioSnapshot()
    const bg = bgRef.current
    if (bg) {
      bg.volume = effectiveMusicVol(snap)
      if (bg.volume <= 0) {
        bg.muted = true
      } else {
        bg.muted = false
      }
    }
    const vol = effectiveSfxVol(snap)
    for (const el of Object.values(sfxRef.current)) {
      if (el) el.volume = vol
    }
  }, [])

  const tryResumeMusic = useCallback(() => {
    const bg = bgRef.current
    if (!bg || !unlockedRef.current) return
    const snap = getAudioSnapshot()
    if (effectiveMusicVol(snap) <= 0) {
      bg.pause()
      return
    }
    bg.play().catch(() => {})
  }, [])

  const unlock = useCallback(() => {
    unlockedRef.current = true
    tryResumeMusic()
  }, [tryResumeMusic])

  useEffect(() => {
    const bg = new Audio(AUDIO_URLS.bgm)
    bg.loop = true
    bg.preload = 'auto'
    bgRef.current = bg

    const names = ['correct', 'wrong', 'uiClick']
    const sfxSlotRef = sfxRef
    const createdSfx = {}
    for (const name of names) {
      const el = new Audio(AUDIO_URLS[name])
      el.preload = 'auto'
      el.addEventListener(
        'error',
        () => {
          if (import.meta.env.DEV) {
            const file =
              name === 'uiClick' ? 'ui-click.mp3' : `${name}.mp3`
            console.warn(
              `[audio] Missing or invalid SFX "${name}". Add: public/audio/${file}`
            )
          }
        },
        { once: true }
      )
      createdSfx[name] = el
      sfxRef.current[name] = el
    }

    const onBgError = () => {
      if (import.meta.env.DEV) {
        console.warn(
          '[audio] Missing or invalid BGM. Add: public/audio/bgm.mp3'
        )
      }
      bg.onerror = null
    }
    bg.addEventListener('error', onBgError, { once: true })

    const unsub = subscribeGameSettings(() => {
      syncVolumes()
      tryResumeMusic()
    })
    syncVolumes()

    const onFirstGesture = () => {
      unlock()
      document.removeEventListener('pointerdown', onFirstGesture, true)
      document.removeEventListener('keydown', onFirstGesture, true)
    }
    document.addEventListener('pointerdown', onFirstGesture, { capture: true, passive: true })
    document.addEventListener('keydown', onFirstGesture, { capture: true, passive: true })

    return () => {
      unsub()
      document.removeEventListener('pointerdown', onFirstGesture, true)
      document.removeEventListener('keydown', onFirstGesture, true)
      bg.removeEventListener('error', onBgError)
      bg.pause()
      bg.src = ''
      bgRef.current = null
      for (const name of names) {
        const el = createdSfx[name]
        if (el) {
          el.pause()
          el.src = ''
        }
      }
      sfxSlotRef.current = { correct: null, wrong: null, uiClick: null }
    }
  }, [syncVolumes, tryResumeMusic, unlock])

  const playSfx = useCallback(
    (id) => {
      const snap = getAudioSnapshot()
      if (effectiveSfxVol(snap) <= 0) return
      const el = sfxRef.current[id]
      if (!el) return
      try {
        el.volume = effectiveSfxVol(snap)
        el.currentTime = 0
        const p = el.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      } catch {
        /* ignore */
      }
    },
    []
  )

  const playUiClick = useCallback(() => playSfx('uiClick'), [playSfx])

  const value = useMemo(
    () => ({
      unlock,
      playSfx,
      playUiClick,
    }),
    [unlock, playSfx, playUiClick]
  )

  return (
    <GameAudioContext.Provider value={value}>{children}</GameAudioContext.Provider>
  )
}

/* eslint-disable react-refresh/only-export-components -- hook is tied to this provider */
export function useGameAudio() {
  const ctx = useContext(GameAudioContext)
  if (!ctx) {
    throw new Error('useGameAudio must be used within GameAudioProvider')
  }
  return ctx
}
