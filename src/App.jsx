import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase/config'
import { watchVolunteers, resolveAdmin, linkUid, isMagicLink } from './firebase/data'
import { volunteerIdFor } from './constants/schedule'
import Login from './pages/Login'
import FinishSignIn from './pages/FinishSignIn'
import GridPage from './pages/GridPage'
import StationPage from './pages/StationPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const [user, setUser] = useState(null)
  const [volunteers, setVolunteers] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [dataError, setDataError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u)
    setAuthReady(true)
  }), [])

  useEffect(() => {
    if (!user) {
      setVolunteers(null)
      setIsAdmin(false)
      return
    }
    resolveAdmin(user).then(setIsAdmin).catch(() => setIsAdmin(false))
    return watchVolunteers(setVolunteers, setDataError)
  }, [user])

  // The roster row is claimed the first time someone signs in with a matching email.
  const me = user && volunteers
    ? volunteers.find((v) => v.id === volunteerIdFor(user.email)) || null
    : null

  useEffect(() => {
    if (me && !me.uid && user) linkUid(me.id, user.uid).catch(() => {})
  }, [me, user])

  if (!authReady) return <div className="boot">Loading…</div>

  // A magic link can land on any path; let FinishSignIn handle it wherever it lands.
  if (!user && isMagicLink()) return <FinishSignIn />

  if (!user) return <Login />

  if (dataError) {
    return (
      <div className="gate">
        <h1>Can’t read the roster</h1>
        <p>
          Firestore refused the read
          {dataError.code === 'permission-denied'
            ? ' — the acl rules almost certainly aren’t deployed to brb-coffee-dev yet.'
            : `: ${dataError.code || 'unknown error'}.`}
        </p>
        <p className="hint">
          Merge <code>firestore.rules</code> into the project’s rules and deploy them, then
          reload.
        </p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  if (volunteers === null) return <div className="boot">Loading roster…</div>

  if (!me && !isAdmin) {
    return (
      <div className="gate">
        <h1>Not on the list</h1>
        <p>
          <b>{user.email}</b> isn’t on the ACL volunteer roster. If that’s wrong, ask
          whoever invited you to add this exact address.
        </p>

        {/*
          Bootstrapping the first admin: aclAdmins/{uid} can't exist before a uid
          does, so the very first sign-in always lands here. Show the uid rather
          than dead-ending on it.
        */}
        <details className="bootstrap" open>
          <summary>Setting yourself up as an admin?</summary>
          <p>
            Create a document in Firestore at <code>aclAdmins</code> with this as the
            document ID, then hard-reload this page. Any fields, or none.
          </p>
          <code className="uid">{user.uid}</code>
          <button
            className="copy"
            onClick={() => navigator.clipboard?.writeText(user.uid)}
          >
            Copy uid
          </button>
        </details>

        <button onClick={() => signOut(auth)}>Sign out</button>
      </div>
    )
  }

  return (
    <div className="app">
      <nav className="topbar">
        <div className="brand">
          <span className="mark">BRB</span>
          <span className="ctx">ACL Volunteers</span>
        </div>
        <div className="tabs">
          <NavLink to="/" end>Schedule</NavLink>
          <NavLink to="/station">Station</NavLink>
          {isAdmin && <NavLink to="/admin">Roster</NavLink>}
        </div>
        <div className="who">
          <span>{me?.name || user.email}{isAdmin && <em> · admin</em>}</span>
          <button onClick={() => signOut(auth).then(() => navigate('/'))}>Sign out</button>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<GridPage me={me} isAdmin={isAdmin} volunteers={volunteers} />} />
          <Route path="/station" element={<StationPage me={me} isAdmin={isAdmin} volunteers={volunteers} />} />
          <Route
            path="/admin"
            element={isAdmin ? <AdminPage volunteers={volunteers} /> : <Navigate to="/" replace />}
          />
          <Route path="/finish" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
