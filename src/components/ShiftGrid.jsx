import { SLOTS_BY_SHIFT, POSITIONS, HEADCOUNT } from '../constants/schedule'

/**
 * Volunteers down the rows, the 12 day+shift slots across the columns.
 *
 * The slot count is fixed at 12 and the roster grows, so this puts the bounded
 * axis on the horizontal — the grid gets taller with more people rather than
 * wider, and vertical scrolling is the one phones do well.
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
    return POSITIONS.find((p) => row[p.id] === volunteerId) || null
  }

  const filledCount = (slot) =>
    POSITIONS.filter((p) => (assignments[slot] || {})[p.id]).length

  // Columns are grouped by shift: six afternoons, then six evenings. A heavy
  // rule separates the two blocks, a lighter one the two weekends inside each.
  const cols = SLOTS_BY_SHIFT
  const dividerAt = (i) => {
    if (i === 0) return ''
    if (cols[i].shift !== cols[i - 1].shift) return 'shift-break'
    if (cols[i].day.weekend !== cols[i - 1].day.weekend) return 'weekend-break'
    return ''
  }

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
            {cols.map((slot, i) => (
              <th
                key={slot.id}
                className={[
                  slot.shift === '12-17' ? 'day' : 'night',
                  dividerAt(i),
                ].filter(Boolean).join(' ')}
                title={`${slot.day.dow} ${slot.day.short} · ${slot.shiftMeta.label}`}
              >
                <b>{slot.day.dow}</b>
                <span className="date">{slot.day.short}</span>
                <span className="shift">{slot.shiftMeta.label}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {volunteers.map((v) => {
            const mine = me && v.id === me.id
            return (
              <tr key={v.id} className={mine ? 'self' : ''}>
                <th className="rowhead">
                  <b>{v.name || v.email}</b>
                  {v.status !== 'active' && <em title="Hasn’t created an account yet">•</em>}
                </th>

                {cols.map((slot, i) => {
                  const free = !!(availability[v.id] || {})[slot.id]
                  const pos = positionOf(slot.id, v.id)
                  const conflict = !!pos && !free

                  const cls = [
                    'cell',
                    layer === 'availability' ? (free ? 'free' : 'unfree') : '',
                    layer === 'assignment' && pos ? 'on' : '',
                    layer === 'assignment' && !pos && free ? 'candidate' : '',
                    conflict ? 'conflict' : '',
                  ].filter(Boolean).join(' ')

                  const editable =
                    layer === 'availability'
                      ? isAdmin || (mine && !locked)
                      : isAdmin || (mine && !!pos)

                  return (
                    <td key={slot.id} className={dividerAt(i)}>
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
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr>
            <th className="corner">Filled</th>
            {cols.map((slot, i) => {
              const filled = filledCount(slot.id)
              return (
                <td
                  key={slot.id}
                  className={`cover ${dividerAt(i)}`}
                >
                  <span className={filled < HEADCOUNT ? 'short' : 'ok'}>
                    {filled}/{HEADCOUNT}
                  </span>
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
