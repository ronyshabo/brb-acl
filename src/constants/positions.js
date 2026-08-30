// Static briefing shown when someone taps a position on the station map.
//
// Keyed by role, not by seat: front-left and front-right do the same job, as do
// the two back positions. Left and right are only where you stand.

import { POSITIONS } from './schedule'

export const ROLE_BRIEFINGS = {
  front: {
    role: 'Front — orders & handoff',
    summary: 'Customer-facing, at the table. You own the order from hello to handoff.',
    duties: [
      'Take the order and run the transaction on the POS',
      'Get the customer’s name with every order',
      'Call the drink back to the back crew',
      'Handle food and snacks start to finish — those never go to the back',
      'Hand the drink over by name, and check it matches before you release it',
    ],
  },
  back: {
    role: 'Back — build & restock',
    summary: 'Behind the table, at the ice machine and the back tables.',
    duties: [
      'Build drinks as they’re called forward — properly iced, clean cup, presentable',
      'Keep receipts and orders straight so nothing gets mixed up',
      'Refill the drink buckets from the back tables',
      'Top up ice before it runs low, not after',
      'Keep the back of house reachable — don’t block the path between the tables',
    ],
  },
}

/** The briefing for a position, plus that seat's own label. */
export function briefingFor(positionId) {
  const position = POSITIONS.find((p) => p.id === positionId)
  if (!position) return null
  const brief = ROLE_BRIEFINGS[position.row]
  return { ...brief, title: position.label, position }
}

export const FLOW_NOTES = [
  'Customers come in at the front of the table. Nobody goes past the table line.',
  'Front takes the order and the customer’s name, then calls it back.',
  'Back builds the drink and passes it forward.',
  'Front checks the name out loud before handing it over — that’s what stops mix-ups.',
  'Food and snacks stay at the front. They never go to the back.',
  'Back watches ice and bucket levels continuously. A refill run takes time you won’t have in a rush.',
]
