import { useState } from 'react'
import { sendInvite, signInWithPassword } from '../firebase/data'
import { explainAuthError } from '../firebase/authErrors'
import '../styles/auth.css'

export default function Login() {
  const [mode, setMode] = useState('link')      // 'link' | 'password'
  // The hand-sent invite links to /?email=… so a volunteer arrives with their
  // address already in the box and only has to press the button.
  const [email, setEmail] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('email') || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'link') {
        await sendInvite(email)
        setSent(true)
      } else {
        await signInWithPassword(email, password)   // App picks up the auth state change
      }
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
        <h1>{mode === 'link' ? 'Volunteer sign-in' : 'Admin sign-in'}</h1>
        <p>
          {mode === 'link'
            ? 'Enter the email you were invited with and we’ll send you a sign-in link.'
            : 'Sign in with the password on your Firebase account.'}
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        {mode === 'password' && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy || !email || (mode === 'password' && !password)}>
          {busy ? 'Working…' : mode === 'link' ? 'Send me a link' : 'Sign in'}
        </button>

        <button
          type="button"
          className="switch"
          onClick={() => { setMode(mode === 'link' ? 'password' : 'link'); setError(null) }}
        >
          {mode === 'link' ? 'Admin sign-in with a password' : 'Back to volunteer sign-in'}
        </button>
      </form>
    </div>
  )
}
