// Static briefing shown when someone taps a position on the station map.
// Four short documents that change maybe twice before the fest — a constants
// module costs nothing to read and nothing to deploy. If this ever needs
// editing from a phone mid-fest, move it to aclStationInfo/{positionId}.

export const BRIEFINGS = {
  'front-left': {
    title: 'Front left — orders',
    summary: 'Customer-facing, left half of the table.',
    duties: [
      'Take orders and payment for the left queue',
      'Call drinks back to the back-left position',
      'Keep cups, lids, and straws stocked on your half of the table',
      'Watch the barrier line — wave people into the shorter queue',
    ],
  },
  'front-right': {
    title: 'Front right — orders',
    summary: 'Customer-facing, right half of the table.',
    duties: [
      'Take orders and payment for the right queue',
      'Call drinks back to the back-right position',
      'Keep cups, lids, and straws stocked on your half of the table',
      'Own the tip jar and the menu board',
    ],
  },
  'back-left': {
    title: 'Back left — build & ice',
    summary: 'Behind the table, left of the ice machine.',
    duties: [
      'Build drinks called from front left',
      'Keep the left bucket pair filled from the back table',
      'Share the ice machine — it is between you and back right',
      'Flag low stock early; a runner refill takes ~15 minutes',
    ],
  },
  'back-right': {
    title: 'Back right — build & ice',
    summary: 'Behind the table, right of the ice machine.',
    duties: [
      'Build drinks called from front right',
      'Keep the right bucket pair filled from the back table',
      'Share the ice machine — it is between you and back left',
      'Break down and haul trash at end of the night shift',
    ],
  },
}

export const FLOW_NOTES = [
  'Customers enter head-on through the barriers and split into two queues.',
  'Side barriers keep foot traffic from cutting across the front of the table.',
  'Orders go front → back on the same side. Do not cross the ice machine.',
  'Back tables are stock only — no customers past the table line.',
]
