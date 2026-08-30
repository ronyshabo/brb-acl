import { DAYS, SHIFTS, POSITIONS, HEADCOUNT, slotId } from '../constants/schedule'

/**
 * The six fest days, grouped by weekend. Each day carries two dots, one per
 * shift. What they encode depends on who's looking:
 *
 *   volunteer → solid when they're on that shift
 *   admin     → solid when all four positions are filled, half when partly
 *               staffed, hollow when nobody is on
 *
 * An admin isn't usually on the roster, so keying the dots to "your shifts"
 * left them permanently empty and unexplained.
 */
export default function FestCalendar({ assignments, me, focusDate, onPick }) {
  const stateFor = (date, shiftId) => {
    const row = assignments[slotId(date, shiftId)] || {}
    const filled = POSITIONS.filter((p) => row[p.id]).length
    const mine = !!me && POSITIONS.some((p) => row[p.id] === me.id)
    return { filled, mine }
  }

  const dotClass = ({ filled, mine }, shift) => {
    const base = `dot ${shift.id === '12-17' ? 'day' : 'night'}`
    if (me) return mine ? `${base} on` : base
    if (filled >= HEADCOUNT) return `${base} on`
    if (filled > 0) return `${base} partial`
    return base
  }

  const dotTitle = ({ filled, mine }, shift) =>
    me
      ? `${shift.label} — ${mine ? 'you’re on this shift' : 'not on this shift'}`
      : `${shift.label} — ${filled} of ${HEADCOUNT} positions filled`

  return (
    <div className="panel calendar">
      <h3>October 2026</h3>
      {[1, 2].map((wk) => (
        <div key={wk} className="week">
          <span className="wklabel">Weekend {wk}</span>
          <div className="days">
            {DAYS.filter((d) => d.weekend === wk).map((d) => {
              const states = SHIFTS.map((s) => stateFor(d.date, s.id))
              const highlight = me
                ? states.some((s) => s.mine)
                : states.every((s) => s.filled >= HEADCOUNT)
              return (
                <button
                  key={d.date}
                  className={`day ${focusDate === d.date ? 'focus' : ''} ${highlight ? 'working' : ''}`}
                  onClick={() => onPick(focusDate === d.date ? null : d.date)}
                >
                  <span className="dow">{d.dow}</span>
                  <span className="num">{d.short.split('/')[1]}</span>
                  <span className="dots">
                    {SHIFTS.map((s, i) => (
                      <i key={s.id} className={dotClass(states[i], s)} title={dotTitle(states[i], s)} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Always rendered — an unexplained dot is worse than no dot. */}
      <p className="calnote">
        {me
          ? 'Two dots per day — the 12–5 and 5–10 shifts. Solid means you’re on it.'
          : 'Two dots per day — the 12–5 and 5–10 shifts. Solid when all 4 positions are filled, half when short.'}
      </p>
    </div>
  )
}
