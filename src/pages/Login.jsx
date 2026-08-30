import { useState } from 'react'
import { sendInvite } from '../firebase/data'
import { explainAuthError } from '../firebase/authErrors'
import '../styles/auth.css'

/**
 * One way in for everyone. Admins aren't a separate sign-in path — admin
 * rights hang off the UID (aclAdmins/{uid}), so how you authenticate makes
 * no difference to what you can do.
 */
export default function Login() {
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
        <h1>Volunteer sign-in</h1>
        <p>Enter your email and we’ll send you a link that signs you straight in.</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy || !email}>
          {busy ? 'Sending…' : 'Send me a link'}
        </button>
      </form>
    </div>
  )
}
