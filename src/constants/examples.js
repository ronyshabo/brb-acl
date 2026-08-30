// Sample roster for trying the app out before real volunteers exist.
//
// Addresses are all @example.com — a reserved domain that can never receive
// mail (RFC 2606). A typo'd real address here would send a stranger a working
// sign-in link to your fest schedule.

import { DAYS, SHIFTS, slotId } from './schedule'

export const EXAMPLE_VOLUNTEERS = [
  { name: 'Maya Ortiz',    email: 'maya@example.com',   free: ['Fri', 'Sat'] },
  { name: 'Chris Delaney', email: 'chris@example.com',  free: ['Sat', 'Sun'] },
  { name: 'Ana Beltran',   email: 'ana@example.com',    free: ['Fri', 'Sat', 'Sun'] },
  { name: 'Devon Pike',    email: 'devon@example.com',  free: ['Sun'] },
  { name: 'Sam Whitfield', email: 'sam@example.com',    free: ['Fri', 'Sun'] },
  { name: 'Jo Nakamura',   email: 'jo@example.com',     free: ['Sat'] },
]

/** Availability map for one example, so the grid has something to show. */
export function exampleAvailability(person) {
  const slots = {}
  for (const day of DAYS) {
    if (!person.free.includes(day.dow)) continue
    for (const shift of SHIFTS) {
      // Devon only does nights; everyone else takes both shifts they're free for.
      if (person.name === 'Devon Pike' && shift.id !== '17-22') continue
      slots[slotId(day.date, shift.id)] = true
    }
  }
  return slots
}
