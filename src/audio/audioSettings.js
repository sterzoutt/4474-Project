/**
 * Game settings (difficulty + audio) in localStorage.
 *
 * Audio files (place in `public/audio/` at repo root):
 *   - bgm.mp3      — background music (looped)
 *   - correct.mp3  — correct answer
 *   - wrong.mp3    — invalid move / wrong valve
 *   - ui-click.mp3 — optional menu button tap
 */

export const GAME_SETTINGS_KEY = 'gameSettings'

/** Vite serves `public/` at site root — use these URLs in Audio elements */
export const AUDIO_URLS = {
    bgm: '/audio/bgm.mp3',
    correct: '/audio/correct.mp3',
    wrong: '/audio/wrong.mp3',
    uiClick: '/audio/ui-click.mp3',
}

const DIFFICULTIES = new Set(['Easy', 'Normal', 'Hard'])

/**
 * Maps the Options difficulty setting to the puzzle-tier key used by
 * getPuzzle() / proceduralPuzzle.DIFFICULTY.
 *   Easy   → 'mini'  (CSV-curated: 2 slots, pipes 1–6)
 *   Normal → 'easy'  (generated:   2 slots, pipes 1–8)
 *   Hard   → 'hard'  (generated:   3 slots, 7 pipes, 2–10)
 */
export function gameDifficultyToPuzzleTier(difficulty) {
  if (difficulty === 'Easy')   return 'mini'
  if (difficulty === 'Normal') return 'easy'
  return 'hard'
}

/** One-line label for a puzzle tier (shown on save card, etc.). */
export function puzzleTierShortLabel(tier) {
  switch (tier) {
    case 'easy': return '2 slots · numbers 1–8'
    case 'hard': return '3 slots · numbers 2–10'
    default:     return '2 slots · numbers 1–6'
  }
}

/**
 * Tooltip text for each difficulty button in Options.
 * Shown on hover (title attr) and as a visible description line.
 */
export const DIFFICULTY_TOOLTIPS = {
  Easy:
    'Curated puzzles: 2 slots, 4 pipes, numbers 1–6. ' +
    'Hints and tips are shown by default to help beginners.',
  Normal:
    'Generated puzzles: 2 slots, 4 pipes, numbers 1–8 (wider range than Easy). ' +
    'Tips only appear after a couple of mistakes.',
  Hard:
    'Generated puzzles: 3 slots, 7 pipes, numbers 2–10. ' +
    'Minimal coaching — hints are hidden until you struggle.',
}

function clampVol(n) {
    const x = Number(n)
    if (Number.isNaN(x)) return 80
    return Math.min(100, Math.max(0, Math.round(x)))
}

function normalize(parsed) {
    const s = parsed && typeof parsed === 'object' ? parsed : {}

    let musicVolume = clampVol(s.musicVolume ?? 80)
    let sfxVolume = clampVol(s.sfxVolume ?? s.soundVolume ?? 80)

    // Legacy per-channel toggles: treat OFF as zero volume for that bus
    if (s.musicEnabled === false) musicVolume = 0
    if (s.soundEnabled === false) sfxVolume = 0

    let audioMuted = Boolean(s.audioMuted)
    if (s.audioMuted == null && s.soundEnabled === false && s.musicEnabled === false) {
        audioMuted = true
    }

    const difficulty = DIFFICULTIES.has(s.difficulty) ? s.difficulty : 'Normal'

    return {
        difficulty,
        musicVolume,
        sfxVolume,
        audioMuted,
    }
}

/** @returns {{ difficulty: string, musicVolume: number, sfxVolume: number, audioMuted: boolean }} */
export function loadGameSettings() {
    try {
        const raw = localStorage.getItem(GAME_SETTINGS_KEY)
        if (!raw) {
            return normalize({})
        }
        return normalize(JSON.parse(raw))
    } catch {
        return normalize({})
    }
}

/**
 * @param {Partial<{ difficulty: string, musicVolume: number, sfxVolume: number, audioMuted: boolean }>} partial
 */
export function saveGameSettings(partial) {
    const next = normalize({...loadGameSettings(), ...partial })
    try {
        localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(next))
    } catch {
        /* ignore quota / private mode */
    }
    notifyListeners()
    return next
}

/** Snapshot for audio engine (no difficulty) */
export function getAudioSnapshot() {
    const s = loadGameSettings()
    return {
        musicVolume: s.musicVolume,
        sfxVolume: s.sfxVolume,
        audioMuted: s.audioMuted,
    }
}

const listeners = new Set()

export function subscribeGameSettings(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function notifyListeners() {
    listeners.forEach((fn) => {
        try {
            fn()
        } catch {
            /* ignore subscriber errors */
        }
    })
}

/** Fresh defaults (e.g. Options reset) */
export function getDefaultGameSettings() {
    return normalize({})
}