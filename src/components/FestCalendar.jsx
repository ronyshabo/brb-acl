import { DAYS, SHIFTS, slotId, POSITIONS } from '../constants/schedule'

/**
 * The six fest days, grouped by weekend. Dots show whether the viewer is on
 * that day's shifts — a volunteer's at-a-glance answer to "when am I working?"
 */
export default function FestCalendar({ assignments, me, focusDate, onPick }) {
  const myShifts = (date) =>
    SHIFTS.filter((s) => {
      const row = assignments[slotId(date, s.id)] || {}
      return me && POSITIONS.some((p) => row[p.id] === me.id)
    })

  return (
    <div className="panel calendar">
      <h3>October 2026</h3>
      {[1, 2].map((wk) => (
        <div key={wk} className="week">
          <span className="wklabel">Weekend {wk}</span>
          <div className="days">
            {DAYS.filter((d) => d.weekend === wk).map((d) => {
              const mine = myShifts(d.date)
              return (
                <button
                  key={d.date}
                  className={`day ${focusDate === d.date ? 'focus' : ''} ${mine.length ? 'working' : ''}`}
                  onClick={() => onPick(focusDate === d.date ? null : d.date)}
                >
                  <span className="dow">{d.dow}</span>
                  <span className="num">{d.short.split('/')[1]}</span>
                  <span className="dots">
                    {SHIFTS.map((s) => (
                      <i
                        key={s.id}
                        className={`dot ${s.id === '12-17' ? 'day' : 'night'} ${
                          mine.some((m) => m.id === s.id) ? 'on' : ''
                        }`}
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {me && <p className="calnote">Filled dots are shifts you’re on.</p>}
    </div>
  )
}
