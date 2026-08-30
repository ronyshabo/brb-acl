import { useState, useEffect } from 'react'
import {
  addVolunteer,
  removeVolunteer,
  sendInvite,
  markInvited,
  clearAvailability,
  setAvailability,
  setPositions,
  watchConfig,
  watchAssignments,
} from '../firebase/data'
import { EXAMPLE_VOLUNTEERS, exampleAvailability } from '../constants/examples'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { SLOTS, POSITIONS } from '../constants/schedule'
import '../styles/admin.css'

export default function AdminPage({ volunteers }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [config, setConfig] = useState({ locked: false })
  const [assignments, setAssign] = useState({})
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => watchConfig(setConfig), [])
  useEffect(() => watchAssignments(setAssign), [])

  async function add(e, { invite }) {
    e.preventDefault()
    setBusy(true)
    try {
      const id = await addVolunteer({ name, email, status: invite ? 'invited' : 'added' })
      if (invite) await sendInvite(id)
      setStatus({
        ok: true,
        text: invite
          ? `Added ${name} and sent a sign-in link to ${id}.`
          : `Added ${name}. No email sent — use Invite on their row when you're ready.`,
      })
      setName('')
      setEmail('')
    } catch (err) {
      setStatus({
        ok: false,
        text: `Couldn’t add them${err?.code ? ` (${err.code})` : ''}. Check the email address.`,
      })
    } finally {
      setBusy(false)
    }
  }

  async function invite(v) {
    try {
      await sendInvite(v.id)
      await markInvited(v.id)
      setStatus({ ok: true, text: `Sign-in link sent to ${v.id}.` })
    } catch (err) {
      setStatus({ ok: false, text: `Couldn’t send to ${v.id}${err?.code ? ` (${err.code})` : ''}.` })
    }
  }

  async function addExamples() {
    setBusy(true)
    try {
      for (const person of EXAMPLE_VOLUNTEERS) {
        const id = await addVolunteer({ ...person, status: 'added', demo: true })
        const slots = exampleAvailability(person)
        for (const [slot, value] of Object.entries(slots)) {
          await setAvailability(id, slot, value)
        }
      }
      setStatus({ ok: true, text: `Added ${EXAMPLE_VOLUNTEERS.length} examples with availability filled in.` })
    } catch (err) {
      setStatus({ ok: false, text: `Couldn’t add examples${err?.code ? ` (${err.code})` : ''}.` })
    } finally {
      setBusy(false)
    }
  }

  async function removeExamples() {
    const demos = volunteers.filter((v) => v.demo)
    if (!demos.length) return
    if (!window.confirm(`Remove ${demos.length} example volunteers and everything they're assigned to?`)) return

    setBusy(true)
    try {
      const demoIds = new Set(demos.map((v) => v.id))

      // Unassign them first — deleting the roster row without this leaves the
      // grid pointing at volunteer ids that no longer exist.
      for (const slot of SLOTS) {
        const row = assignments[slot.id] || {}
        if (!POSITIONS.some((p) => demoIds.has(row[p.id]))) continue
        const cleaned = { ...row }
        for (const p of POSITIONS) if (demoIds.has(cleaned[p.id])) cleaned[p.id] = null
        await setPositions(slot.id, cleaned, { date: slot.date, shift: slot.shift })
      }

      for (const v of demos) {
        await clearAvailability(v.id)
        await removeVolunteer(v.id)
      }
      setStatus({ ok: true, text: `Removed ${demos.length} examples.` })
    } catch (err) {
      setStatus({ ok: false, text: `Couldn’t remove examples${err?.code ? ` (${err.code})` : ''}.` })
    } finally {
      setBusy(false)
    }
  }

  function remove(v) {
    if (!window.confirm(`Remove ${v.name || v.id} from the roster?`)) return
    removeVolunteer(v.id)
  }

  const toggleLock = () =>
    setDoc(doc(db, 'aclConfig', 'settings'), { locked: !config.locked }, { merge: true })

  function exportCsv() {
    const rows = [['date', 'shift', 'position', 'volunteer', 'email']]
    for (const slot of SLOTS) {
      for (const p of POSITIONS) {
        const vid = (assignments[slot.id] || {})[p.id]
        const v = volunteers.find((x) => x.id === vid)
        rows.push([slot.date, slot.shiftMeta.label, p.label, v?.name || '', vid || ''])
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'brb-acl-schedule.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="adminpage">
      <div className="panel">
        <h3>Add a volunteer</h3>
        <form onSubmit={(e) => add(e, { invite: true })} className="addform">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
          />
          <button type="submit" disabled={busy || !name || !email}>Add &amp; invite</button>
          <button
            type="button"
            className="secondary"
            disabled={busy || !name || !email}
            onClick={(e) => add(e, { invite: false })}
          >
            Add without email
          </button>
        </form>
        <p className="formnote">
          <b>Add &amp; invite</b> sends a sign-in link now. <b>Add without email</b> just puts them
          on the roster so you can plan around them — you can invite them later from their row.
        </p>

        <div className="examples">
          <button type="button" onClick={addExamples} disabled={busy}>
            Add {EXAMPLE_VOLUNTEERS.length} example volunteers
          </button>
          {volunteers.some((v) => v.demo) && (
            <button type="button" className="danger" onClick={removeExamples} disabled={busy}>
              Remove examples
            </button>
          )}
          <span>Fake @example.com people with availability filled in, so the grid has something in it.</span>
        </div>
        {status && <p className={status.ok ? 'ok' : 'err'}>{status.text}</p>}
      </div>

      <div className="panel">
        <div className="panelhead">
          <h3>Roster · {volunteers.length}</h3>
          <div className="acts">
            <button onClick={exportCsv}>Export CSV</button>
            <button className={config.locked ? 'locked' : ''} onClick={toggleLock}>
              {config.locked ? 'Unlock schedule' : 'Lock schedule'}
            </button>
          </div>
        </div>
        <table className="roster">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {volunteers.map((v) => (
              <tr key={v.id}>
                <td>{v.name || <em>—</em>}</td>
                <td className="mono">{v.id}</td>
                <td>
                  <span className={`pill ${v.status}`}>
                    {v.status === 'active' ? 'signed in'
                      : v.status === 'invited' ? 'invited'
                      : 'not invited'}
                  </span>
                  {v.demo && <span className="pill demo">example</span>}
                </td>
                <td className="rowacts">
                  {v.status !== 'active' && (
                    <button onClick={() => invite(v)}>
                      {v.status === 'invited' ? 'Resend' : 'Invite'}
                    </button>
                  )}
                  <button className="danger" onClick={() => remove(v)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
