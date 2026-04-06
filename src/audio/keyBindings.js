/**
 * keyBindings.js — persistent keyboard shortcut storage.
 *
 * Stores user-customised key bindings in localStorage alongside the other
 * game settings. Each binding is a single character string (e.g. 'r', 'h').
 * Special keys are stored as descriptive strings: 'Enter', 'Tab', ' ' (space).
 *
 * Exposed API:
 *   loadKeyBindings()              → current bindings object
 *   saveKeyBindings(partial)       → merge + persist
 *   getDefaultKeyBindings()        → factory defaults
 *   BINDABLE_ACTIONS               → ordered list of actions with metadata
 */

export const KEY_BINDINGS_KEY = 'fpKeyBindings'

/** Default key bindings — matches what was hard-coded before customisation. */
const DEFAULTS = {
  reset: 'r',
  hint:  'h',
  valve: 'Enter',
}

/**
 * Ordered list of actions players can rebind.
 * Used to render the settings table in OptionsScreen.
 */
export const BINDABLE_ACTIONS = [
  { id: 'reset', label: 'Reset puzzle',  description: 'Clear all placed pipes and start over' },
  { id: 'hint',  label: 'Hint',          description: 'Highlight a useful pipe in the tray' },
  { id: 'valve', label: 'Open valve',    description: 'Submit your answer when the board is full' },
]

/** Human-readable display of a stored key string. */
export function displayKey(key) {
  if (key === 'Enter') return '↵ Enter'
  if (key === ' ')     return '⎵ Space'
  if (key === 'Tab')   return '⇥ Tab'
  return key.toUpperCase()
}

/** Load current bindings; falls back to defaults for any missing key. */
export function loadKeyBindings() {
  try {
    const raw = localStorage.getItem(KEY_BINDINGS_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      reset: typeof parsed.reset === 'string' ? parsed.reset : DEFAULTS.reset,
      hint:  typeof parsed.hint  === 'string' ? parsed.hint  : DEFAULTS.hint,
      valve: typeof parsed.valve === 'string' ? parsed.valve : DEFAULTS.valve,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

/** Merge partial bindings and persist. */
export function saveKeyBindings(partial) {
  const next = { ...loadKeyBindings(), ...partial }
  try {
    localStorage.setItem(KEY_BINDINGS_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}

/** Factory defaults (used by the Options reset button). */
export function getDefaultKeyBindings() {
  return { ...DEFAULTS }
}
