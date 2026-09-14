import { useState, useEffect, useMemo } from 'react'
import { watchShopShifts, watchBaristas, watchAssignments } from '../firebase/data'
import { DAYS, SHIFTS, POSITIONS, slotId } from '../constants/schedule'
import '../styles/shop.css'

const SHIFT_LABEL = { opening: 'Opening', closing: 'Closing', shared: 'Shared' }

/**
 * The shop schedule on fest days, so you can see who's already committed
 * before assigning them at Zilker.
 *
 * Reads brb-schedule's `schedules` collection. Nothing here writes.
 */
export default function ShopPage({ volunteers }) {
  const [shifts, setShifts] = useState(null)
  const [baristas, setBaristas] = useState([])
  const [assignments, setAssign] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => watchShopShifts(setShifts, setError), [])
  useEffect(() => watchBaristas(setBaristas, () => {}), [])
  useEffect(() => watchAssignments(setAssign, () => {}), [])

  /** Everyone on an ACL position that day, as {uid, name} pairs. */
  const aclThatDay = useMemo(() => {
    const byDate = {}
    for (const day of DAYS) {
      const people = []
      for (const shift of SHIFTS) {
        const row = assignments[slotId(day.date, shift.id)] || {}
        for (const p of POSITIONS) {
          const vid = row[p.id]
          if (!vid) continue
          const v = volunteers.find((x) => x.id === vid)
          people.push({
            volunteerId: vid,
            uid: v?.uid || null,
            name: v?.name || vid,
            shift: shift.label,
            position: p.label,
          })
        }
      }
      byDate[day.date] = people
    }
    return byDate
  }, [assignments, volunteers])

  const byDay = useMemo(() => {
    if (!shifts) return []
    return DAYS.map((day) => {
      const onShop = shifts.filter((s) => s.date === day.date)
      const acl = aclThatDay[day.date] || []

      // A barista is double-booked if the same uid is on both, or — for the
      // six who never linked an account — if the names match. Only the uid
      // match is certain; the other is a prompt to check.
      const clashes = onShop.flatMap((s) => {
        const byUid = acl.find((a) => a.uid && a.uid === s.baristaId)
        if (byUid) return [{ shop: s, acl: byUid, certain: true }]
        const byName = acl.find(
          (a) => a.name.trim().toLowerCase() === (s.baristaName || '').trim().toLowerCase()
        )
        return byName ? [{ shop: s, acl: byName, certain: false }] : []
      })

      return { day, onShop, clashes }
    })
  }, [shifts, aclThatDay])

  if (error) {
    return (
      <div className="shoppage">
        <div className="panel">
          <h3>Can’t read the shop schedule</h3>
          <p>
            {error.code === 'permission-denied'
              ? 'Firestore refused the read — the rule letting ACL admins see the schedules collection isn’t deployed yet.'
              : `Firestore said: ${error.code || 'unknown error'}.`}
          </p>
        </div>
      </div>
    )
  }

  if (shifts === null) return <div className="boot">Reading the shop schedule…</div>

  const totalClashes = byDay.reduce((n, d) => n + d.clashes.length, 0)

  return (
    <div className="shoppage">
      <div className={`panel summary ${totalClashes ? 'bad' : ''}`}>
        <h3>Shop shifts during ACL</h3>
        <p>
          {totalClashes
            ? `${totalClashes} ${totalClashes === 1 ? 'person is' : 'people are'} on both the shop rota and the ACL schedule.`
            : 'Nobody is booked at the shop and at Zilker on the same day.'}
        </p>
      </div>

      <div className="days">
        {byDay.map(({ day, onShop, clashes }) => (
          <section key={day.date} className={`day ${clashes.length ? 'clash' : ''}`}>
            <h2>
              {day.dow} {day.short}
              <span className="wk">Weekend {day.weekend}</span>
            </h2>

            {onShop.length === 0 ? (
              <p className="clear">Shop rota is empty — nobody committed.</p>
            ) : (
              <ul className="shifts">
                {onShop.map((s) => {
                  const clash = clashes.find((c) => c.shop.id === s.id)
                  return (
                    <li key={s.id} className={clash ? (clash.certain ? 'certain' : 'possible') : ''}>
                      <b>{s.baristaName || 'Unnamed'}</b>
                      <span className="type">{SHIFT_LABEL[s.shiftType] || s.shiftType}</span>
                      {clash && (
                        <span className="warn">
                          {clash.certain ? 'also on ACL' : 'name matches someone on ACL'} —{' '}
                          {clash.acl.shift}, {clash.acl.position}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="panel note">
        <h3>How this matches people</h3>
        <p>
          A shop shift is matched to an ACL assignment by Firebase account. Only baristas
          who’ve linked an account can be matched that way — for the others this falls back
          to comparing names, which is shown as <b>name matches</b> rather than asserted as
          a clash. Read-only: nothing here changes either schedule.
        </p>
      </div>
    </div>
  )
}
