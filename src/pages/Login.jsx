import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn, sendPasswordReset } from '../firebase/data'
import { explainAuthError } from '../firebase/authErrors'
import '../styles/auth.css'

export default function Login() {
  const [email, setEmail] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('email') || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await signIn(email, password)          // App picks up the auth state change
    } catch (err) {
      setError(explainAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    if (!email) {
      setError('Enter your email first, then hit "Forgot password".')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sendPasswordReset(email)
      setNotice(`Sent a reset link to ${email}. Check spam if it doesn’t arrive.`)
    } catch (err) {
      setError(explainAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <span className="eyebrow">BRB Coffee · ACL</span>
        <h1>Sign in</h1>
        <p>Volunteers and admins both sign in here.</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          required
        />

        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <button type="submit" disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <button type="button" className="switch" onClick={forgot} disabled={busy}>
          Forgot password
        </button>

        <p className="quiet">
          First time here? Use the <b>Create your account</b> link in your invitation
          email, or <Link to={`/join${email ? `?email=${encodeURIComponent(email)}` : ''}`}>
          sign up</Link>.
        </p>
      </form>
    </div>
  )
}
