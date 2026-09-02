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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
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

/* ── menu ───────────────────────────────────────────────────────────────── */

/**
 * The menu lives as an array on aclConfig/settings rather than in its own
 * collection. It is 6-8 items that only admins edit, aclConfig already has
 * exactly the rules a menu needs (signed-in read, admin write), and a separate
 * collection would mean publishing new rules for no benefit.
 *
 * The trade-off is that a save rewrites the whole array, so two admins editing
 * at the same moment can overwrite each other. With two or three admins and a
 * handful of items that is not worth defending against.
 */
export const watchMenu = (cb, onError) =>
  onSnapshot(
    doc(db, 'aclConfig', 'settings'),
    (d) => cb(d.exists() ? d.data().menu || [] : []),
    onError
  )

export async function saveMenu(items) {
  await setDoc(
    doc(db, 'aclConfig', 'settings'),
    { menu: items, menuUpdatedAt: serverTimestamp() },
    { merge: true }
  )
}

/** Stable local id — the array has no document ids to lean on. */
export const newMenuId = () =>
  (globalThis.crypto?.randomUUID?.() || `m${Date.now()}${Math.random().toString(36).slice(2, 7)}`)

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

/* ── email + password ───────────────────────────────────────────────────── */

// No magic links and no verification mail. Firebase's built-in mailer has an
// invisible daily cap that cannot be raised or monitored, and a link that
// arrives in spam is worse than no link. An invitation is now just a URL the
// admin sends from their own Gmail; the account is created in the browser.

export const signIn = (email, password) =>
  signInWithEmailAndPassword(auth, volunteerIdFor(email), password)

export const createAccount = (email, password) =>
  createUserWithEmailAndPassword(auth, volunteerIdFor(email), password)

/**
 * The one place Firebase still sends mail. Rare enough not to matter against
 * the quota, and an admin can also reset a password from the Firebase console
 * if it ever refuses.
 */
export const sendPasswordReset = (email) =>
  sendPasswordResetEmail(auth, volunteerIdFor(email))

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
