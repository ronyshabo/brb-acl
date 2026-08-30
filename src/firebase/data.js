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

export const watchVolunteers = (cb) =>
  onSnapshot(collection(db, 'aclVolunteers'), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )

export const watchAvailability = (cb) =>
  onSnapshot(collection(db, 'aclAvailability'), (snap) => {
    const byVolunteer = {}
    snap.forEach((d) => {
      byVolunteer[d.id] = d.data().slots || {}
    })
    cb(byVolunteer)
  })

export const watchAssignments = (cb) =>
  onSnapshot(collection(db, 'aclAssignments'), (snap) => {
    const bySlot = {}
    snap.forEach((d) => {
      bySlot[d.id] = d.data().positions || emptyPositions()
    })
    cb(bySlot)
  })

export const watchConfig = (cb) =>
  onSnapshot(doc(db, 'aclConfig', 'settings'), (d) =>
    cb(d.exists() ? d.data() : { locked: false })
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

export async function addVolunteer({ name, email, phone = '' }) {
  const id = volunteerIdFor(email)
  await setDoc(doc(db, 'aclVolunteers', id), {
    name: name.trim(),
    email: id,
    phone,
    status: 'invited',
    uid: null,
    invitedAt: serverTimestamp(),
    claimedAt: null,
    notes: '',
  })
  return id
}

export const removeVolunteer = (id) => deleteDoc(doc(db, 'aclVolunteers', id))

export const isAdminUid = async (uid) =>
  uid ? (await getDoc(doc(db, 'aclAdmins', uid))).exists() : false

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
