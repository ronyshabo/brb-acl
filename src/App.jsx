import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase/config'
import { watchVolunteers, resolveAdmin, linkUid, selfRegisterVolunteer } from './firebase/data'
import { volunteerIdFor } from './constants/schedule'
import Login from './pages/Login'
import JoinPage from './pages/JoinPage'
import GridPage from './pages/GridPage'
import StationPage from './pages/StationPage'
import MenuPage from './pages/MenuPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const [user, setUser] = useState(null)
  const [volunteers, setVolunteers] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [dataError, setDataError] = useState(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)
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

  // Signed out: the invitation link points at /join, everything else is sign-in.
  // Routed rather than read off window.location, so navigating between the two
  // client-side actually re-renders.
  if (!user) {
    return (
      <Routes>
        <Route path="/join" element={<JoinPage />} />
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

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

  // Signed in with no roster row: add one. Anyone who can sign up is a
  // volunteer — the roster is not a guest list. Admins are skipped, since an
  // admin who isn't working shifts has no business taking a column in the grid.
  if (!me && !isAdmin) {
    if (joinError) {
      return (
        <div className="gate">
          <h1>Couldn’t add you to the roster</h1>
          <p>{joinError}</p>
          <p className="hint">Signed in as <b>{user.email}</b>.</p>
          <button onClick={() => { setJoinError(null); window.location.reload() }}>Try again</button>
          <button onClick={() => signOut(auth)}>Sign out</button>
        </div>
      )
    }
    if (!joining) {
      setJoining(true)
      selfRegisterVolunteer(user).catch((err) =>
        setJoinError(
          err?.code === 'permission-denied'
            ? 'The rules that let volunteers add themselves aren’t deployed yet.'
            : `Firestore said: ${err?.code || 'unknown error'}.`
        )
      )
    }
    return <div className="boot">Setting up your spot…</div>
  }

  return (
    <div className="app">
      <nav className="topbar">
        <div className="brand">
          <span className="mark">BRB Coffee</span>
          <span className="ctx">ACL Volunteers</span>
        </div>
        <div className="tabs">
          <NavLink to="/" end>Schedule</NavLink>
          <NavLink to="/station">Station</NavLink>
          <NavLink to="/menu">Menu</NavLink>
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
          <Route path="/menu" element={<MenuPage isAdmin={isAdmin} />} />
          <Route
            path="/admin"
            element={isAdmin ? <AdminPage volunteers={volunteers} /> : <Navigate to="/" replace />}
          />
          <Route path="/join" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
