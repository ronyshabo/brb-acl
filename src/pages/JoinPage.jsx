import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAccount } from '../firebase/data'
import { explainAuthError } from '../firebase/authErrors'
import '../styles/auth.css'

/**
 * Set a password and get in. No verification email and no magic link — the
 * invitation is a plain URL the admin sends from their own Gmail, so nothing
 * here depends on Firebase's mailer.
 *
 * Anyone can reach this page, but an account on its own grants nothing: the
 * roster gate in App.jsx and the Firestore rules both key on being listed in
 * aclVolunteers.
 */
export default function JoinPage() {
  // Prefilled from the invitation link. It has to match the roster address
  // exactly — that address IS the volunteer's document id — so getting it from
  // the link avoids the most likely mistake.
  const [email, setEmail] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('email') || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const tooShort = password.length > 0 && password.length < 6
  const mismatch = confirm.length > 0 && password !== confirm

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('The two passwords don’t match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createAccount(email, password)   // App links the uid to the roster row
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
        <h1>Create your account</h1>
        <p>
          Pick a password and you’re in. Nothing to confirm, no link to wait for.
        </p>

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
          placeholder="Password — at least 6 characters"
          autoComplete="new-password"
          required
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          autoComplete="new-password"
          required
        />

        {tooShort && <p className="quiet">A little longer — 6 characters minimum.</p>}
        {mismatch && <p className="quiet">Those don’t match yet.</p>}
        {error && <p className="error">{error}</p>}

        <button
          type="submit"
          disabled={busy || !email || password.length < 6 || password !== confirm}
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>

        <p className="quiet">
          Use the same email your invitation was sent to — that’s how we match you to
          the roster. Already set a password? <Link to="/">Sign in</Link>.
        </p>
      </form>
    </div>
  )
}
