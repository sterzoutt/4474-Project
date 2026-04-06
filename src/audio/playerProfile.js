/**
 * Player experience profile — persisted in localStorage across sessions.
 *
 * Used to drive ADAPTIVE PROGRESSIVE DISCLOSURE in PipesGame:
 *   the interface reveals or hides help based on accumulated play history
 *   and in-session performance signals.
 *
 * ─── Expertise tiers ───────────────────────────────────────────────────────
 *
 *  'novice'        First-time or early players, or heavy hint-users.
 *                  Show: instruction tip, equation hint line, valve label,
 *                  more obvious affordance cues.
 *
 *  'intermediate'  Players who have completed at least one session and are
 *                  managing reasonably.
 *                  Show: tip + hint line only after a mistake or two.
 *
 *  'expert'        Veterans: multiple sessions, rarely used hints.
 *                  Show: minimal coaching; help available on request only.
 *
 * ─── Override rules (applied on top of base tier) ──────────────────────────
 *
 *  "Struggling"    ≥ 3 mistakes on current puzzle OR ≥ 2 avg per question
 *                  → temporary upgrade to 'novice' behaviour regardless of tier.
 *
 *  "On a streak"   ≥ 3 consecutive clean solves (no hints) this session
 *                  → temporary upgrade to 'expert' behaviour regardless of tier.
 *
 * ─── Manual override ───────────────────────────────────────────────────────
 *   The "ⓘ HOW" button always opens the How-to-Play modal, so the player
 *   can always request help explicitly no matter what tier they are in.
 */

const PROFILE_KEY = 'fpPlayerProfile'
const PROFILE_VERSION = 1

function defaultProfile() {
  return {
    v: PROFILE_VERSION,
    sessionsCompleted: 0,  // full 8-question runs completed
    totalPuzzlesSolved: 0, // individual puzzles ever solved
    totalHintsEver: 0,     // hints requested across all time
    cleanSolves: 0,        // puzzles solved with zero hints (lifetime)
  }
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return defaultProfile()
    const p = JSON.parse(raw)
    if (!p || p.v !== PROFILE_VERSION) return defaultProfile()
    return { ...defaultProfile(), ...p }
  } catch {
    return defaultProfile()
  }
}

function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch { /* ignore quota / private mode */ }
}

/**
 * Call after each puzzle is solved (transPhase === 'exit').
 * Updates lifetime hint and clean-solve counts.
 *
 * @param {{ hintsUsed: number }} result
 */
export function recordPuzzleSolved({ hintsUsed }) {
  const p = loadProfile()
  p.totalPuzzlesSolved += 1
  p.totalHintsEver += hintsUsed
  if (hintsUsed === 0) p.cleanSolves += 1
  saveProfile(p)
}

/**
 * Call when a full 8-question session completes (sessionDone becomes true).
 * Increments session count, unlocking higher tiers.
 */
export function recordSessionComplete() {
  const p = loadProfile()
  p.sessionsCompleted += 1
  saveProfile(p)
}

/**
 * Derives a stable base expertise tier from cumulative profile + current
 * difficulty setting.  In-session overrides (struggling / streak) are
 * applied on top of this in PipesGame, not here.
 *
 * Thresholds are intentionally gentle so players progress through tiers
 * naturally rather than being stuck as 'novice' for too long.
 *
 * @param {ReturnType<loadProfile>} profile
 * @param {'Easy'|'Normal'|'Hard'} difficulty
 * @returns {'novice'|'intermediate'|'expert'}
 */
export function getExpertiseTier(profile, difficulty) {
  const { sessionsCompleted, totalPuzzlesSolved, totalHintsEver, cleanSolves } = profile

  // First-time players always receive full guidance
  if (sessionsCompleted === 0) return 'novice'

  // Hint ratio: average hints per puzzle (lower = more self-sufficient)
  const hintRatio = totalPuzzlesSolved > 0
    ? totalHintsEver / totalPuzzlesSolved
    : 1

  // Expert: at least 3 completed sessions, mostly hint-free, and not playing
  // on Easy (Easy always gets a friendlier default regardless of experience)
  if (
    sessionsCompleted >= 3 &&
    (hintRatio < 0.3 || cleanSolves >= 12) &&
    difficulty !== 'Easy'
  ) return 'expert'

  // Intermediate: at least 1 session done and reasonable hint usage
  if (sessionsCompleted >= 1 && hintRatio < 0.9) return 'intermediate'

  return 'novice'
}
