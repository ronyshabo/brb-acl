import { useState } from 'react'
import { sendInvite } from '../firebase/data'
import '../styles/auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
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
      setError(
        err?.code === 'auth/invalid-email'
          ? 'That doesn’t look like an email address.'
          : 'Couldn’t send the link. Check the address and try again.'
      )
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="auth">
        <div className="card">
          <h1>Check your email</h1>
          <p>
            We sent a sign-in link to <b>{email}</b>. Open it on this device if you can —
            it signs you straight in, no password.
          </p>
          <button className="ghost" onClick={() => setSent(false)}>Use a different address</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <span className="eyebrow">BRB Coffee · ACL</span>
        <h1>Volunteer sign-in</h1>
        <p>Enter the email you were invited with and we’ll send you a sign-in link.</p>
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
