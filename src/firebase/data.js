import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import { db, auth } from './config'
import { emptyPositions, volunteerIdFor, POSITIONS } from '../constants/schedule'

const EMAIL_KEY = 'brb-acl:pendingEmail'

/* ── live reads ─────────────────────────────────────────────────────────── */

// Every watcher takes an onError. Without one, a permission-denied from
// undeployed rules leaves the UI spinning forever with only a console message.
export const watchVolunteers = (cb, onError) =>
  onSnapshot(
    collection(db, 'aclVolunteers'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )

export const watchAvailability = (cb, onError) =>
  onSnapshot(
    collection(db, 'aclAvailability'),
    (snap) => {
      const byVolunteer = {}
      snap.forEach((d) => {
        byVolunteer[d.id] = d.data().slots || {}
      })
      cb(byVolunteer)
    },
    onError
  )

export const watchAssignments = (cb, onError) =>
  onSnapshot(
    collection(db, 'aclAssignments'),
    (snap) => {
      const bySlot = {}
      snap.forEach((d) => {
        bySlot[d.id] = d.data().positions || emptyPositions()
      })
      cb(bySlot)
    },
    onError
  )

export const watchConfig = (cb, onError) =>
  onSnapshot(
    doc(db, 'aclConfig', 'settings'),
    (d) => cb(d.exists() ? d.data() : { locked: false }),
    onError
  )

/* ── availability (volunteer-owned layer) ───────────────────────────────── */

export async function setAvailability(volunteerId, slot, available) {
  await setDoc(
    doc(db, 'aclAvailability', volunteerId),
    { slots: { [slot]: available }, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

/* ── assignments (admin-owned layer) ────────────────────────────────────── */

/** Writes the whole positions map for one slot. Admin only, per the rules. */
export async function setPositions(slot, positions, meta = {}) {
  await setDoc(
    doc(db, 'aclAssignments', slot),
    {
      date: meta.date ?? null,
      shift: meta.shift ?? null,
      positions: { ...emptyPositions(), ...positions },
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? null,
    },
    { merge: true }
  )
}

/**
 * A volunteer vacating their own position. Writes only the one key, which is
 * what the security rule checks — see dropOk() in firestore.rules.
 */
export async function dropPosition(slot, positionId, volunteerId, reason = '') {
  await updateDoc(doc(db, 'aclAssignments', slot), {
    [`positions.${positionId}`]: null,
    updatedAt: serverTimestamp(),
  })
  await addDoc(collection(db, 'aclDropLog'), {
    volunteerId,
    slotId: slot,
    positionId,
    reason,
    at: serverTimestamp(),
  })
}

/* ── roster ─────────────────────────────────────────────────────────────── */

/**
 * `status` is 'added' for someone put on the roster by hand and 'invited' once
 * a sign-in link has actually gone out. Keeping them distinct means the roster
 * can show who still needs an email, rather than claiming everyone was invited.
 */
export async function addVolunteer({ name, email, phone = '', status = 'added' }) {
  const id = volunteerIdFor(email)
  await setDoc(doc(db, 'aclVolunteers', id), {
    name: name.trim(),
    email: id,
    phone,
    status,
    uid: null,
    invitedAt: status === 'invited' ? serverTimestamp() : null,
    claimedAt: null,
    notes: '',
  })
  return id
}

export const markInvited = (id) =>
  updateDoc(doc(db, 'aclVolunteers', id), { status: 'invited', invitedAt: serverTimestamp() })

export const clearAvailability = (volunteerId) =>
  deleteDoc(doc(db, 'aclAvailability', volunteerId))

export const removeVolunteer = (id) => deleteDoc(doc(db, 'aclVolunteers', id))

/**
 * Mirrors isAclAdmin() in firestore.rules. Kept in the same shape on purpose —
 * if these two drift, the UI and the rules disagree and you get buttons that
 * throw permission-denied.
 *
 *   1. an `admin` custom claim on the token
 *   2. one of the project's standing admin addresses
 *   3. an aclAdmins/{uid} doc, for fest-only admins
 */
export const PROJECT_ADMIN_EMAILS = ['brbcafeatx@gmail.com']

export async function resolveAdmin(user) {
  if (!user) return false

  try {
    const token = await user.getIdTokenResult()
    if (token.claims?.admin === true) return true
  } catch {
    /* fall through to the cheaper checks */
  }

  if (PROJECT_ADMIN_EMAILS.includes((user.email || '').toLowerCase())) return true

  try {
    return (await getDoc(doc(db, 'aclAdmins', user.uid))).exists()
  } catch {
    return false
  }
}

/* ── magic link ─────────────────────────────────────────────────────────── */

const actionCodeSettings = () => ({
  url: `${window.location.origin}/finish`,
  handleCodeInApp: true,
})

export async function sendInvite(email) {
  const clean = volunteerIdFor(email)
  await sendSignInLinkToEmail(auth, clean, actionCodeSettings())
  try {
    window.localStorage.setItem(EMAIL_KEY, clean)
  } catch {
    /* private mode — FinishSignIn will prompt for the address instead */
  }
}

export const isMagicLink = (href = window.location.href) =>
  isSignInWithEmailLink(auth, href)

export async function completeSignIn(emailFromPrompt) {
  let email = emailFromPrompt
  if (!email) {
    try {
      email = window.localStorage.getItem(EMAIL_KEY)
    } catch {
      email = null
    }
  }
  if (!email) return { needsEmail: true }

  const cred = await signInWithEmailLink(auth, volunteerIdFor(email), window.location.href)
  try {
    window.localStorage.removeItem(EMAIL_KEY)
  } catch {
    /* nothing to clean up */
  }
  return { user: cred.user }
}

/**
 * First-time link of a Firebase uid to the roster row. The rule only permits
 * this once, while uid is still null and the email matches.
 */
export async function linkUid(volunteerId, uid) {
  await updateDoc(doc(db, 'aclVolunteers', volunteerId), {
    uid,
    status: 'active',
    claimedAt: serverTimestamp(),
  })
}

export { POSITIONS }
