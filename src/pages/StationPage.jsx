import { useState, useEffect, useMemo } from 'react'
import { watchAssignments } from '../firebase/data'
import { SLOTS, POSITIONS } from '../constants/schedule'
import { BRIEFINGS, FLOW_NOTES } from '../constants/positions'
import StationMap from '../components/StationMap'
import '../styles/station.css'

export default function StationPage({ me, isAdmin, volunteers }) {
  const [assignments, setAssign] = useState({})
  const [slotIdx, setSlotIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [pinned, setPinned] = useState(false)

  useEffect(() => watchAssignments(setAssign), [])

  // A volunteer lands on their own next shift rather than the first of the fest.
  const myFirstIdx = useMemo(() => {
    if (!me) return -1
    return SLOTS.findIndex((s) =>
      POSITIONS.some((p) => (assignments[s.id] || {})[p.id] === me.id)
    )
  }, [assignments, me])

  useEffect(() => {
    if (!pinned && myFirstIdx >= 0) {
      setSlotIdx(myFirstIdx)
      setPinned(true)
    }
  }, [myFirstIdx, pinned])

  const slot = SLOTS[slotIdx]
  const positions = assignments[slot.id] || {}
  const nameFor = (vid) => volunteers.find((v) => v.id === vid)?.name || vid
  const myPosition = me
    ? POSITIONS.find((p) => positions[p.id] === me.id)?.id ?? null
    : null

  const brief = picked ? BRIEFINGS[picked] : null

  return (
    <div className="stationpage">
      <div className="slotnav">
        <button
          onClick={() => { setSlotIdx((i) => Math.max(0, i - 1)); setPinned(true) }}
          disabled={slotIdx === 0}
          aria-label="Previous shift"
        >
          ←
        </button>
        <div className="slotlabel">
          <b>{slot.day.dow} {slot.day.short}</b>
          <span className={slot.shift === '12-17' ? 'day' : 'night'}>
            {slot.shiftMeta.label}
          </span>
          <em>{slot.shiftMeta.note}</em>
        </div>
        <button
          onClick={() => { setSlotIdx((i) => Math.min(SLOTS.length - 1, i + 1)); setPinned(true) }}
          disabled={slotIdx === SLOTS.length - 1}
          aria-label="Next shift"
        >
          →
        </button>
      </div>

      {myPosition && (
        <p className="youare">
          You’re on <b>{POSITIONS.find((p) => p.id === myPosition).label}</b> for this shift.
        </p>
      )}

      <div className="stationlayout">
        <div className="mapwrap">
          <StationMap
            positions={positions}
            nameFor={nameFor}
            highlight={myPosition}
            onPick={setPicked}
          />
          <p className="maphint">Tap a position for what it covers.</p>
        </div>

        <aside className="briefwrap">
          {brief ? (
            <div className="panel brief">
              <button className="close" onClick={() => setPicked(null)} aria-label="Close">×</button>
              <h3>{brief.title}</h3>
              <p className="summary">{brief.summary}</p>
              <p className="holder">
                {positions[picked]
                  ? <>On this shift: <b>{nameFor(positions[picked])}</b></>
                  : <em>Nobody assigned yet</em>}
              </p>
              <ul>
                {brief.duties.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          ) : (
            <div className="panel">
              <h3>How the station runs</h3>
              <ul className="flow">
                {FLOW_NOTES.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
