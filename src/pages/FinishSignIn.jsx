import { useState, useEffect } from 'react'
import { completeSignIn } from '../firebase/data'
import '../styles/auth.css'

export default function FinishSignIn() {
  const [needsEmail, setNeedsEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    completeSignIn()
      .then((r) => { if (r.needsEmail) setNeedsEmail(true) })
      .catch(() => setError('That link didn’t work. It may have expired — request a new one.'))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      await completeSignIn(email)
    } catch {
      setError('That address doesn’t match the link. Try the one the invite was sent to.')
    }
  }

  if (error) {
    return (
      <div className="auth">
        <div className="card">
          <h1>Link didn’t work</h1>
          <p className="error">{error}</p>
          <button onClick={() => { window.location.href = '/' }}>Start over</button>
        </div>
      </div>
    )
  }

  if (needsEmail) {
    return (
      <div className="auth">
        <form className="card" onSubmit={submit}>
          <h1>One more thing</h1>
          <p>You opened this link on a different device. Confirm the email it was sent to.</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <button type="submit" disabled={!email}>Sign in</button>
        </form>
      </div>
    )
  }

  return <div className="boot">Signing you in…</div>
}
