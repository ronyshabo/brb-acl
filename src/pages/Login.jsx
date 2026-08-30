import { useState } from 'react'
import { sendInvite } from '../firebase/data'
import { explainAuthError } from '../firebase/authErrors'
import '../styles/auth.css'

/**
 * Two signposted entrances, one mechanism. Both send an email link — admin
 * rights hang off the UID (aclAdmins/{uid}), so authentication is identical
 * either way. The split exists so an admin isn't left wondering whether the
 * volunteer form is the right door.
 */
export default function Login() {
  const [mode, setMode] = useState('volunteer')   // 'volunteer' | 'admin'
  // The hand-sent invite links to /?email=… so a volunteer arrives with their
  // address already in the box and only has to press the button.
  const [email, setEmail] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('email') || ''
    } catch {
      return ''
    }
  })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const isAdmin = mode === 'admin'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await sendInvite(email)
      setSent(true)
    } catch (err) {
      setError(explainAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="auth">
        <div className="card">
          <span className="eyebrow">BRB Coffee · ACL</span>
          <h1>Check your email</h1>
          <p>
            We sent a sign-in link to <b>{email}</b>. Open it on this device if you can —
            it signs you straight in, no password.
          </p>
          <p className="quiet">
            Not there after a minute? Check spam — it comes from
            noreply@brb-coffee-dev.firebaseapp.com.
          </p>
          <button className="ghost" onClick={() => setSent(false)}>
            Use a different address
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <span className="eyebrow">BRB Coffee · ACL</span>
        <h1>{isAdmin ? 'Admin sign-in' : 'Volunteer sign-in'}</h1>
        <p>
          {isAdmin
            ? 'Enter your admin email and we’ll send you a sign-in link. No password — access is tied to your account.'
            : 'Enter your email and we’ll send you a link that signs you straight in.'}
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isAdmin ? 'admin@brbcoffee-atx.com' : 'you@example.com'}
          autoComplete="email"
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy || !email}>
          {busy ? 'Sending…' : 'Send me a link'}
        </button>
        <button
          type="button"
          className="switch"
          onClick={() => { setMode(isAdmin ? 'volunteer' : 'admin'); setError(null) }}
        >
          {isAdmin ? 'Back to volunteer sign-in' : 'Admin sign-in'}
        </button>
      </form>
    </div>
  )
}
