import { SLOTS, POSITIONS, HEADCOUNT } from '../constants/schedule'

/**
 * 12 slot rows × volunteer columns.
 *
 * Availability and assignment are separate stored layers, so a cell can be
 * "assigned but no longer available" — that's the conflict state, and it is the
 * whole reason the two layers aren't collapsed into one field.
 */
export default function ShiftGrid({
  layer,
  volunteers,
  availability,
  assignments,
  me,
  isAdmin,
  locked,
  onToggleAvailability,
  onCycleAssignment,
  onDrop,
}) {
  const positionOf = (slot, volunteerId) => {
    const row = assignments[slot] || {}
    const hit = POSITIONS.find((p) => row[p.id] === volunteerId)
    return hit || null
  }

  const filledCount = (slot) =>
    POSITIONS.filter((p) => (assignments[slot] || {})[p.id]).length

  function cellClick(slot, volunteer) {
    const mine = me && volunteer.id === me.id
    if (layer === 'availability') {
      if (locked && !isAdmin) return
      if (!isAdmin && !mine) return
      onToggleAvailability(volunteer.id, slot, !(availability[volunteer.id] || {})[slot])
      return
    }
    const pos = positionOf(slot, volunteer.id)
    if (isAdmin) {
      onCycleAssignment(slot, volunteer.id, pos)
    } else if (mine && pos) {
      onDrop(slot, pos.id)
    }
  }

  return (
    <div className="grid-scroll">
      <table className="grid">
        <thead>
          <tr>
            <th className="corner">
              {layer === 'availability' ? 'Who’s free' : 'Who’s on'}
            </th>
            {volunteers.map((v) => (
              <th key={v.id} className={me && v.id === me.id ? 'self' : ''}>
                <span>{v.name || v.email}</span>
                {v.status === 'invited' && <em title="Invite not yet claimed">•</em>}
              </th>
            ))}
            <th className="cover">Filled</th>
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot, i) => {
            const newWeekend = i > 0 && slot.day.weekend !== SLOTS[i - 1].day.weekend
            const filled = filledCount(slot.id)
            return (
              <tr key={slot.id} className={newWeekend ? 'weekend-break' : ''}>
                <th className={`rowhead ${slot.shift === '12-17' ? 'day' : 'night'}`}>
                  <b>{slot.day.dow} {slot.day.short}</b>
                  <span>{slot.shiftMeta.label}</span>
                </th>

                {volunteers.map((v) => {
                  const free = !!(availability[v.id] || {})[slot.id]
                  const pos = positionOf(slot.id, v.id)
                  const conflict = !!pos && !free
                  const mine = me && v.id === me.id

                  const cls = [
                    'cell',
                    layer === 'availability' ? (free ? 'free' : 'unfree') : '',
                    layer === 'assignment' && pos ? 'on' : '',
                    layer === 'assignment' && !pos && free ? 'candidate' : '',
                    conflict ? 'conflict' : '',
                    mine ? 'mine' : '',
                  ].filter(Boolean).join(' ')

                  const editable =
                    layer === 'availability'
                      ? isAdmin || (mine && !locked)
                      : isAdmin || (mine && !!pos)

                  return (
                    <td key={v.id}>
                      <button
                        type="button"
                        className={cls}
                        disabled={!editable}
                        onClick={() => cellClick(slot.id, v)}
                        title={
                          conflict
                            ? `Assigned ${pos.label} but marked unavailable`
                            : pos
                              ? pos.label
                              : free ? 'Available' : 'Not available'
                        }
                      >
                        {layer === 'assignment' && pos ? pos.code : free ? '✓' : ''}
                        {conflict && <span className="flag">!</span>}
                      </button>
                    </td>
                  )
                })}

                <td className="cover">
                  <span className={filled < HEADCOUNT ? 'short' : 'ok'}>
                    {filled}/{HEADCOUNT}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
