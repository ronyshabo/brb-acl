import { useState, useEffect } from 'react'
import {
  addVolunteer,
  removeVolunteer,
  sendInvite,
  markInvited,
  clearAvailability,
  setPositions,
  watchConfig,
  watchAssignments,
} from '../firebase/data'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { SLOTS, POSITIONS } from '../constants/schedule'
import { explainAuthError } from '../firebase/authErrors'
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
      setStatus({ ok: false, text: `Couldn’t add them. ${explainAuthError(err)}` })
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
      setStatus({ ok: false, text: `Couldn’t invite ${v.id}. ${explainAuthError(err)}` })
    }
  }

  /**
   * Removing someone has to unassign them first. Deleting the roster row on its
   * own leaves aclAssignments holding a volunteer id that resolves to nobody,
   * and the grid and station map then render blanks you can't clear.
   */
  async function remove(v) {
    if (!window.confirm(`Remove ${v.name || v.id}? Any shifts they're on will be freed.`)) return
    setBusy(true)
    try {
      for (const slot of SLOTS) {
        const row = assignments[slot.id] || {}
        if (!POSITIONS.some((p) => row[p.id] === v.id)) continue
        const cleaned = { ...row }
        for (const p of POSITIONS) if (cleaned[p.id] === v.id) cleaned[p.id] = null
        await setPositions(slot.id, cleaned, { date: slot.date, shift: slot.shift })
      }
      await clearAvailability(v.id)
      await removeVolunteer(v.id)
      setStatus({ ok: true, text: `Removed ${v.name || v.id} and freed their shifts.` })
    } catch (err) {
      setStatus({ ok: false, text: `Couldn't remove them${err?.code ? ` (${err.code})` : ''}.` })
    } finally {
      setBusy(false)
    }
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
        {status && <p className={status.ok ? 'ok' : 'err'}>{status.text}</p>}
        <p className="formnote">
          <b>Add &amp; invite</b> sends a sign-in link now. <b>Add without email</b> just puts them
          on the roster so you can plan around them — you can invite them later from their row.
        </p>

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
