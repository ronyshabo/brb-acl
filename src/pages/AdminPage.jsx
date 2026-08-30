import { useState, useEffect } from 'react'
import {
  addVolunteer,
  removeVolunteer,
  sendInvite,
  watchConfig,
  watchAssignments,
} from '../firebase/data'
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

  useEffect(() => watchConfig(setConfig), [])
  useEffect(() => watchAssignments(setAssign), [])

  async function add(e) {
    e.preventDefault()
    try {
      const id = await addVolunteer({ name, email })
      await sendInvite(id)
      setStatus({ ok: true, text: `Added ${name} and sent an invite to ${id}.` })
      setName('')
      setEmail('')
    } catch {
      setStatus({ ok: false, text: 'Couldn’t add them. Check the email address.' })
    }
  }

  async function resend(v) {
    try {
      await sendInvite(v.id)
      setStatus({ ok: true, text: `Invite resent to ${v.id}.` })
    } catch {
      setStatus({ ok: false, text: `Couldn’t resend to ${v.id}.` })
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
        <form onSubmit={add} className="addform">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
          />
          <button type="submit" disabled={!name || !email}>Add &amp; invite</button>
        </form>
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
                    {v.status === 'active' ? 'signed in' : v.status}
                  </span>
                </td>
                <td className="rowacts">
                  {v.status !== 'active' && <button onClick={() => resend(v)}>Resend</button>}
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
