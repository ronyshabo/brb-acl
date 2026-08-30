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
      viewBox="0 70 640 590"
      role="img"
      aria-label="BRB station floor plan with volunteer positions"
    >
      <text x="320" y="92" className="flow" textAnchor="middle">CUSTOMERS APPROACH</text>
      <path d="M320 102 L320 126" className="fl" />
      <path d="M314 120 L320 128 L326 120" className="fl" />

      <polygon className="bar" points="205,140 222,157 205,240 188,257 188,157" />
      <polygon className="bar" points="395,140 412,157 395,240 378,257 378,157" />
      <polygon className="bar" points="205,255 222,272 205,300 188,317 188,272" />
      <polygon className="bar" points="395,255 412,272 395,300 378,317 378,272" />
      <polygon className="bar" points="150,310 90,310 30,340 90,370 150,370 90,340" />
      <polygon className="bar" points="490,310 550,310 610,340 550,370 490,370 550,340" />
      <text x="168" y="205" className="lbl" textAnchor="end">traffic</text>
      <text x="168" y="219" className="lbl" textAnchor="end">barriers</text>

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
