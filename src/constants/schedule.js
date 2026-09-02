// The fest is a fixed, known shape — six days, two shifts, four positions.
// Nothing here is user-editable, so it lives in the repo rather than Firestore.

export const DAYS = [
  { date: '2026-10-02', dow: 'Fri', short: '10/2',  weekend: 1 },
  { date: '2026-10-03', dow: 'Sat', short: '10/3',  weekend: 1 },
  { date: '2026-10-04', dow: 'Sun', short: '10/4',  weekend: 1 },
  { date: '2026-10-09', dow: 'Fri', short: '10/9',  weekend: 2 },
  { date: '2026-10-10', dow: 'Sat', short: '10/10', weekend: 2 },
  { date: '2026-10-11', dow: 'Sun', short: '10/11', weekend: 2 },
]

export const SHIFTS = [
  { id: '12-17', label: '12–5pm', name: 'Day',   note: 'arrive ~10:30 for prep' },
  { id: '17-22', label: '5–10pm', name: 'Night', note: 'stay until ~11:15 to clean' },
]

export const POSITIONS = [
  { id: 'front-left',  label: 'Front left',  code: 'FL', row: 'front' },
  { id: 'front-right', label: 'Front right', code: 'FR', row: 'front' },
  { id: 'back-left',   label: 'Back left',   code: 'BL', row: 'back'  },
  { id: 'back-right',  label: 'Back right',  code: 'BR', row: 'back'  },
]

export const HEADCOUNT = POSITIONS.length

export const slotId = (date, shift) => `${date}_${shift}`

const makeSlot = (day, shift) => ({
  id: slotId(day.date, shift.id),
  date: day.date,
  shift: shift.id,
  day,
  shiftMeta: shift,
})

/**
 * All 12 slots in the order they happen. This is the canonical order — the
 * station tab steps through it one shift at a time, and Friday night should
 * follow Friday afternoon.
 */
export const SLOTS = DAYS.flatMap((day) => SHIFTS.map((shift) => makeSlot(day, shift)))

/**
 * The same 12 slots grouped by shift: all six afternoons, then all six
 * evenings. This is how the grid reads its columns — comparing who can work
 * afternoons is a different question from what happens on Friday, and the
 * grid is where that comparison gets made.
 */
export const SLOTS_BY_SHIFT = SHIFTS.flatMap((shift) => DAYS.map((day) => makeSlot(day, shift)))

export const emptyPositions = () =>
  Object.fromEntries(POSITIONS.map((p) => [p.id, null]))

/** A volunteer's doc id is their lowercased email — the security rules rely on this. */
export const volunteerIdFor = (email) => (email || '').trim().toLowerCase()
