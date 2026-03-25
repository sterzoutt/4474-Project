/**
 * PipeBoard.jsx — board/canvas component for the plumbing puzzle game.
 *
 * Renders a vertical stack of pipe rows between a fixed START pipe and
 * a fixed END pipe.  Each pipe is an SVG horizontal bar with one end
 * curving up and the other curving down (determined by its variant).
 *
 * Empty rows display a connection-indicator arrow on the side where
 * the upward connector is expected, derived from the downSide of the
 * pipe in the row above.
 *
 * Props:
 *   totalRows   – number of playable slots between start and end
 *   placedPipes – array of pipe objects (from pipeTypes.js) already on the board
 *   startPipe   – fixed pipe at the top (pre-placed)
 *   endPipe     – fixed pipe at the bottom (pre-placed)
 *   activeRow   – index of the row the player should place next
 */

import { SAMPLE_PUZZLE, createPipe } from './pipeTypes'
import './PipeBoard.css'

/* ── SVG center-line paths ────────────────────────────────────────
   viewBox: 0 0 500 70
   left-up  → up connector at x=50  (left),  down connector at x=450 (right)
   right-up → up connector at x=450 (right), down connector at x=50  (left)
   The horizontal bar spans 70→430 at y=35.                           */

const PIPE_D = {
  'left-up':  'M 50,0 L 50,18 Q 50,35 70,35 L 430,35 Q 450,35 450,52 L 450,70',
  'right-up': 'M 450,0 L 450,18 Q 450,35 430,35 L 70,35 Q 50,35 50,52 L 50,70',
}

const CONN_X = { left: 50, right: 450 }

/* ── Pipe shape (SVG) ─────────────────────────────────────────── */

export function PipeSVG({ variant, value, kind }) {
  const d = PIPE_D[variant]
  const grad =
    kind === 'start' || kind === 'end'
      ? 'url(#pb-gFixed)'
      : 'url(#pb-gPipe)'

  return (
    <svg viewBox="0 0 500 70" className="pb-svg">
      {/* outer shadow */}
      <path
        d={d} fill="none" stroke="rgba(0,0,0,0.5)"
        strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* metallic body */}
      <path
        d={d} fill="none" stroke={grad}
        strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* highlight shine */}
      <path
        d={d} fill="none" stroke="url(#pb-gShine)"
        strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* value label */}
      <text
        x="250" y="35"
        textAnchor="middle" dominantBaseline="central"
        className="pb-val"
      >
        {value}
      </text>
    </svg>
  )
}

/* ── Empty row with connection indicator ──────────────────────── */

export function EmptySlotSVG({ expectedSide }) {
  const x = expectedSide ? CONN_X[expectedSide] : null

  return (
    <svg viewBox="0 0 500 70" className="pb-svg">
      {/* dashed horizontal placeholder bar */}
      <line
        x1="80" y1="35" x2="420" y2="35"
        stroke="rgba(74,158,222,0.25)" strokeWidth="2" strokeDasharray="10 6"
      />

      {/* indicator arrow + guide line */}
      {x != null && (
        <>
          <line
            x1={x} y1="0" x2={x} y2="28"
            stroke="rgba(189,199,0,0.55)" strokeWidth="2.5" strokeDasharray="4 3"
          />
          <polygon
            points={`${x - 11},28 ${x + 11},28 ${x},10`}
            fill="#BDC700" opacity="0.8"
          />
        </>
      )}

      <text x="250" y="52" textAnchor="middle" className="pb-ph">?</text>
    </svg>
  )
}

/* ── Vertical connector strip ─────────────────────────────────── */

export function Connector({ side }) {
  if (!side) return <div className="pb-gap" />
  const x = CONN_X[side]
  return (
    <svg viewBox="0 0 500 10" className="pb-conn">
      <line
        x1={x} y1="0" x2={x} y2="10"
        stroke="rgba(255,255,255,0.22)" strokeWidth="5" strokeLinecap="round"
      />
    </svg>
  )
}

/* ── Board ─────────────────────────────────────────────────────── */

export default function PipeBoard({
  totalRows,
  placedPipes = [],
  startPipe,
  endPipe,
  activeRow,
}) {
  const pipeAt = (row) => placedPipes.find((p) => p.rowIndex === row)

  const sideAbove = (rowIndex) => {
    if (rowIndex === 0) return startPipe.downSide
    const above = pipeAt(rowIndex - 1)
    return above ? above.downSide : null
  }

  return (
    <div className="pb-board">
      {/* shared SVG gradient defs (hidden, referenced by all pipe SVGs) */}
      <svg width="0" height="0" className="pb-defs">
        <defs>
          <linearGradient id="pb-gPipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ddd" />
            <stop offset="30%"  stopColor="#b5b5b5" />
            <stop offset="60%"  stopColor="#888" />
            <stop offset="100%" stopColor="#555" />
          </linearGradient>
          <linearGradient id="pb-gFixed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffe680" />
            <stop offset="30%"  stopColor="#ffd700" />
            <stop offset="60%"  stopColor="#daa520" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
          <linearGradient id="pb-gShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="white" stopOpacity="0.5" />
            <stop offset="45%"  stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Start pipe (fixed) ── */}
      <div className="pb-row pb-row--fixed">
        <span className="pb-tag pb-tag--start">START</span>
        <PipeSVG variant={startPipe.variant} value={startPipe.value} kind="start" />
      </div>

      <Connector side={startPipe.downSide} />

      {/* ── Playable rows ── */}
      {Array.from({ length: totalRows }, (_, i) => {
        const pipe   = pipeAt(i)
        const active = i === activeRow
        const cls = [
          'pb-row',
          pipe   ? 'pb-row--filled' : 'pb-row--empty',
          active ? 'pb-row--active'  : '',
        ].filter(Boolean).join(' ')

        return (
          <div key={i} className="pb-slot-group">
            <div className={cls}>
              <span className="pb-num">{i + 1}</span>
              {pipe
                ? <PipeSVG variant={pipe.variant} value={pipe.value} />
                : <EmptySlotSVG expectedSide={sideAbove(i)} />}
            </div>
            {i < totalRows - 1 && (
              <Connector side={pipe ? pipe.downSide : null} />
            )}
          </div>
        )
      })}

      <Connector side={pipeAt(totalRows - 1)?.downSide} />

      {/* ── End pipe (fixed) ── */}
      <div className="pb-row pb-row--fixed">
        <PipeSVG variant={endPipe.variant} value={endPipe.value} kind="end" />
        <span className="pb-tag pb-tag--end">TARGET</span>
      </div>
    </div>
  )
}

/* ── Static demo ──────────────────────────────────────────────── */

export function PipeBoardDemo({ onBack }) {
  const start  = createPipe('start', 6, 'right-up', -1)
  const end    = createPipe('end',  11, 'left-up',   4)
  const placed = SAMPLE_PUZZLE.slice(0, 2)

  return (
    <div className="pb-demo">
      {onBack && (
        <button className="pb-back-btn" onClick={onBack}>&#8592; MENU</button>
      )}
      <h2 className="pb-demo-title">Pipe Board</h2>
      <PipeBoard
        totalRows={4}
        placedPipes={placed}
        startPipe={start}
        endPipe={end}
        activeRow={2}
      />
    </div>
  )
}
