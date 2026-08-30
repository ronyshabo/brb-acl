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
import { INVITE_SUBJECT, buildInviteBody, gmailComposeUrl } from '../constants/inviteEmail'
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

  async function copyInvite(v) {
    const text = `Subject: ${INVITE_SUBJECT}\n\n${buildInviteBody(v)}`
    try {
      await navigator.clipboard.writeText(text)
      setStatus({ ok: true, text: `Invite for ${v.name || v.id} copied — paste it into Gmail.` })
    } catch {
      setStatus({ ok: false, text: 'Clipboard blocked by the browser. Use the Gmail button instead.' })
    }
  }

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
        <h3>Invitation email</h3>
        <p className="formnote">
          Sent by hand from the BRB Gmail — it lands in inboxes and reads like a person,
          which Firebase&rsquo;s automated mail does not. <b>Copy</b> puts it on your clipboard,
          <b>Gmail</b> opens a compose window with it filled in. Each one is personalised with
          the volunteer&rsquo;s first name from the roster.
        </p>
        <details className="preview">
          <summary>Preview</summary>
          <p className="subjline"><b>Subject:</b> {INVITE_SUBJECT}</p>
          <pre>{buildInviteBody({ name: 'Maya Ortiz', email: 'maya@example.com' })}</pre>
        </details>
        <p className="formnote">
          It carries no sign-in link on purpose — only the server can mint one without
          sending it. Instead it points them at the portal with their address prefilled,
          so Firebase&rsquo;s link arrives as something they just asked for.
          <b> Invite</b> still fires that automated link directly if you&rsquo;d rather.
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
                  <button onClick={() => copyInvite(v)} title="Copy the invitation text">
                    Copy
                  </button>
                  <a
                    className="btn"
                    href={gmailComposeUrl(v)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Gmail with this invite ready to send"
                  >
                    Gmail
                  </a>
                  {v.status !== 'active' && (
                    <button onClick={() => invite(v)} title="Send the automated Firebase sign-in link">
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
