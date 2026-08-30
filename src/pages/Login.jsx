import { useState } from 'react'
import { sendInvite, signInWithPassword } from '../firebase/data'
import '../styles/auth.css'

/** Firebase error codes, said in plain language. */
function explain(err) {
  switch (err?.code) {
    case 'auth/operation-not-allowed':
      return 'Email-link sign-in isn’t switched on for this Firebase project yet. Enable it under Auth → Sign-in method, or use admin sign-in below.'
    case 'auth/invalid-email':
      return 'That doesn’t look like an email address.'
    case 'auth/unauthorized-continue-uri':
      return 'This domain isn’t in Firebase’s authorized domains list.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password don’t match an account.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.'
    default:
      return `Sign-in failed${err?.code ? ` (${err.code})` : ''}.`
  }
}

export default function Login() {
  const [mode, setMode] = useState('link')      // 'link' | 'password'
  const [email, setEmail] = useState('')
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
      setError(explain(err))
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
