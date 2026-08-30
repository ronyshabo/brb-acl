import { POSITIONS } from '../constants/schedule'

const SEAT = {
  'front-left':  { cx: 200, cy: 390, label: [200, 428, 'front left'] },
  'front-right': { cx: 400, cy: 390, label: [400, 428, 'front right'] },
  'back-left':   { cx: 200, cy: 470, label: [200, 508, 'back left'] },
  'back-right':  { cx: 400, cy: 470, label: [400, 508, 'back right'] },
}

/** Fit a volunteer's name into a 60px-wide ellipse without overflowing it. */
function shortName(name) {
  if (!name) return '—'
  const first = name.trim().split(/\s+/)[0]
  return first.length > 9 ? `${first.slice(0, 8)}…` : first
}

export default function StationMap({ positions = {}, nameFor, highlight, onPick }) {
  return (
    <svg
      className="stationmap"
      viewBox="0 235 640 390"
      role="img"
      aria-label="BRB station floor plan: service table, four volunteer positions around an ice machine, and two back tables with drink buckets"
    >
      <text x="320" y="258" className="flow" textAnchor="middle">CUSTOMERS APPROACH</text>
      <path d="M320 268 L320 288" className="fl" />
      <path d="M314 282 L320 290 L326 282" className="fl" />

      <rect x="140" y="300" width="320" height="60" className="tbl" />
      <text x="300" y="337" className="tlbl" textAnchor="middle">SERVICE TABLE</text>

      <rect x="270" y="390" width="60" height="120" rx="10" className="ice" />
      <text x="300" y="444" className="ilbl" textAnchor="middle">ICE</text>
      <text x="300" y="458" className="ilbl" textAnchor="middle">MACHINE</text>

      {POSITIONS.map((p) => {
        const seat = SEAT[p.id]
        const vid = positions[p.id]
        const cls = [
          'vol',
          vid ? 'filled' : 'empty',
          highlight === p.id ? 'highlight' : '',
        ].filter(Boolean).join(' ')
        return (
          <g
            key={p.id}
            className={`seat ${onPick ? 'clickable' : ''}`}
            onClick={onPick ? () => onPick(p.id) : undefined}
            role={onPick ? 'button' : undefined}
            tabIndex={onPick ? 0 : undefined}
            onKeyDown={onPick ? (e) => (e.key === 'Enter' || e.key === ' ') && onPick(p.id) : undefined}
          >
            <ellipse cx={seat.cx} cy={seat.cy} rx="34" ry="21" className={cls} />
            <text x={seat.cx} y={seat.cy + 5} className="vname" textAnchor="middle">
              {shortName(vid ? nameFor(vid) : null)}
            </text>
            <text x={seat.label[0]} y={seat.label[1]} className="lbl" textAnchor="middle">
              {seat.label[2]}
            </text>
          </g>
        )
      })}

      <rect x="150" y="540" width="150" height="60" rx="10" className="furn" />
      <rect x="300" y="540" width="150" height="60" rx="10" className="furn" />
      <circle cx="190" cy="570" r="20" className="bkt" />
      <circle cx="250" cy="570" r="20" className="bkt" />
      <circle cx="340" cy="570" r="20" className="bkt" />
      <circle cx="400" cy="570" r="20" className="bkt" />
      <text x="468" y="566" className="lbl">2 back tables</text>
      <text x="468" y="581" className="lbl">4 drink buckets</text>
    </svg>
  )
}
