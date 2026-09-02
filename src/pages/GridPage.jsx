import { useState, useEffect, useMemo } from 'react'
import {
  watchAvailability,
  watchAssignments,
  watchConfig,
  setAvailability,
  setPositions,
  dropPosition,
} from '../firebase/data'
import { SLOTS, POSITIONS, HEADCOUNT } from '../constants/schedule'
import ShiftGrid from '../components/ShiftGrid'
import '../styles/grid.css'

export default function GridPage({ me, isAdmin, volunteers }) {
  const [layer, setLayer] = useState(isAdmin ? 'assignment' : 'availability')
  const [availability, setAvail] = useState({})
  const [assignments, setAssign] = useState({})
  const [config, setConfig] = useState({ locked: false })

  useEffect(() => watchAvailability(setAvail), [])
  useEffect(() => watchAssignments(setAssign), [])
  useEffect(() => watchConfig(setConfig), [])

  const conflicts = useMemo(() => {
    const out = []
    for (const slot of SLOTS) {
      const row = assignments[slot.id] || {}
      for (const p of POSITIONS) {
        const vid = row[p.id]
        if (vid && !(availability[vid] || {})[slot.id]) out.push({ slot, position: p, vid })
      }
    }
    return out
  }, [assignments, availability])

  const unfilled = SLOTS.reduce(
    (n, s) => n + (HEADCOUNT - POSITIONS.filter((p) => (assignments[s.id] || {})[p.id]).length),
    0
  )

  /**
   * Admin click walks a volunteer through the positions still open in that slot,
   * then off the shift entirely — open → FL → FR → BL → BR → off.
   */
  function cycleAssignment(slot, volunteerId, current) {
    const row = assignments[slot] || {}
    // Positions this volunteer could take: free ones, plus the one they already hold.
    const open = POSITIONS.filter((p) => !row[p.id] || row[p.id] === volunteerId)
    if (!open.length) return

    const idx = current ? open.findIndex((p) => p.id === current.id) : -1
    const next = idx + 1 >= open.length ? null : open[idx + 1]

    const positions = { ...row }
    if (current) positions[current.id] = null
    if (next) positions[next.id] = volunteerId

    const meta = SLOTS.find((s) => s.id === slot)
    setPositions(slot, positions, { date: meta.date, shift: meta.shift })
  }

  function drop(slot, positionId) {
    if (!window.confirm('Drop this shift? The admin will see that you released it.')) return
    dropPosition(slot, positionId, me.id)
  }

  const volunteerList = volunteers
    .slice()
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))

  return (
    <div className="gridpage">
      <aside>
        <div className="panel">
          <h3>Coverage</h3>
          <p className={unfilled ? 'warn' : 'good'}>
            {unfilled ? `${unfilled} position${unfilled === 1 ? '' : 's'} still open` : 'All 48 positions filled'}
          </p>
          {conflicts.length > 0 && (
            <>
              <h3 className="bad">Conflicts</h3>
              <ul className="conflicts">
                {conflicts.map((c) => {
                  const v = volunteers.find((x) => x.id === c.vid)
                  return (
                    <li key={`${c.slot.id}-${c.position.id}`}>
                      <b>{v?.name || c.vid}</b> is on {c.position.label} for{' '}
                      {c.slot.day.dow} {c.slot.day.short} {c.slot.shiftMeta.label} but marked
                      themselves unavailable.
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {!isAdmin && (
          <div className="panel hint">
            <h3>What you can change</h3>
            <p>
              Tap your own column to mark the shifts you’re free for. If you’ve been placed
              on a shift you can no longer work, switch to <b>Assignments</b> and tap your
              own cell to drop it.
            </p>
          </div>
        )}
      </aside>

      <div className="main">
        <div className="layerbar">
          <div className="toggle">
            <button
              className={layer === 'availability' ? 'active' : ''}
              onClick={() => setLayer('availability')}
            >
              Availability
            </button>
            <button
              className={layer === 'assignment' ? 'active' : ''}
              onClick={() => setLayer('assignment')}
            >
              Assignments
            </button>
          </div>
          {config.locked && <span className="lockpill">Schedule locked</span>}
          {isAdmin && layer === 'assignment' && (
            <span className="tip">Click a cell to move someone through the open positions</span>
          )}
        </div>

        <ShiftGrid
          layer={layer}
          volunteers={volunteerList}
          availability={availability}
          assignments={assignments}
          me={me}
          isAdmin={isAdmin}
          locked={config.locked}
          onToggleAvailability={setAvailability}
          onCycleAssignment={cycleAssignment}
          onDrop={drop}
        />

        <div className="legend">
          <span><i className="sw free" /> available</span>
          <span><i className="sw on" /> assigned</span>
          <span><i className="sw conflict" /> assigned but unavailable</span>
          <span className="codes">FL front left · FR front right · BL back left · BR back right</span>
        </div>
      </div>
    </div>
  )
}
