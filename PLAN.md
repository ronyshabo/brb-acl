# brb-acl — Build Plan

Volunteer scheduling portal for BRB Coffee's ACL Fest presence.
`acl.brbcoffee-atx.com` · React 18 + Vite + Firebase · own repo, shared Firebase project.

---

## Locked decisions

| | |
|---|---|
| **Dates** | Fri/Sat/Sun **Oct 2–4** and **Oct 9–11, 2026** — 6 days |
| **Shifts** | **12–5pm** and **5–10pm**. Prep (before 12) and cleanup (after 10) are folded into the shift — the 12–5 crew arrives early, the 5–10 crew stays late. 2 rows/day = **12 slots total** |
| **Main view** | Grid: 12 day+shift rows × volunteer columns. Small Oct calendar on the side |
| **Grid model** | One layout, **two stored layers** — availability (volunteer-written) and assignments (admin-written) — with a header toggle |
| **Auth** | Firebase Auth **email-link / passwordless**. Firebase sends the mail itself; no SMTP or SendGrid |
| **Volunteers may** | Edit their own availability · drop a shift they were assigned |
| **Volunteers may not** | Self-claim open shifts · initiate swaps. Admin does all assigning |
| **Headcount** | **4 volunteers per shift** — 12 slots × 4 = **48 volunteer-shifts** across the fest |
| **Positions** | Assigned individually — front left, front right, back left, back right. The station tab renders names onto the map, so the schedule has to know who stands where |
| **Hosting** | New repo, own subdomain, host port **3006**, infra cloned from `brb-schedule` |

---

## Station layout

Customers approach the front; back of house is behind. Four volunteers work each shift in a 2×2
around the ice machine:

```
              ▼ customers
        ║           ║          traffic barriers
        ║           ║
   ◄ ═══════════════════ ►     side barriers
   ┌─────────────────────┐
   │    SERVICE TABLE    │     front counter
   └─────────────────────┘
     (V1)   ┌───┐   (V2)       front left / front right
            │ICE│
     (V3)   └───┘   (V4)       back left / back right
   ┌─────────┐ ┌─────────┐
   │ (o) (o) │ │ (o) (o) │     2 back tables, 4 drink buckets
   └─────────┘ └─────────┘
```

The four positions aren't interchangeable: **front left/right** work the table and face
customers, **back left/right** cover the ice machine and the drink buckets. So the schedule
stores *which* position each volunteer holds, not just that four people are on — that's what
lets the station tab print names onto this map.

### Station tab

The same map, rendered live from `aclAssignments`. A volunteer opening it sees their own next
shift with their position highlighted; the admin can page through any of the 12 slots. Each
position is tappable and opens its briefing — crowd flow, what that spot is responsible for,
where the backup ice is.

That briefing copy is static reference material, and it should **start as a constants module in
the repo**, not a Firestore collection — it's four short documents that change maybe twice
before the fest, and a `positions.js` export costs nothing to write and nothing to read. Move it
to `aclStationInfo/{positionId}` only if you want to edit it from your phone mid-fest without a
redeploy. That's a real possibility worth deciding before Phase 6, not a hypothetical.

---

## Data model (Firestore)

All collections prefixed `acl` so they never collide with the shared project's existing ones.

```
aclConfig/settings
  days: ["2026-10-02", … "2026-10-11"]      # 6
  shifts: [{id:"12-17", label:"12–5pm"}, {id:"17-22", label:"5–10pm"}]
  headcount: 4                               # every slot, all 12
  positions: ["front-left","front-right","back-left","back-right"]
  locked: false                              # freeze volunteer edits near the date

aclVolunteers/{volunteerId}
  name, email (lowercased), phone
  status: "invited" | "active" | "declined"
  uid: null                                  # set once, on first magic-link sign-in
  invitedAt, claimedAt, notes

aclAvailability/{volunteerId}                # one doc per person — one write per edit
  slots: { "2026-10-02_12-17": true, "2026-10-03_17-22": true, … }
  updatedAt

aclAssignments/{slotId}                      # 12 docs, slotId = "2026-10-02_12-17"
  date, shift
  positions: {                               # null = unfilled
    "front-left":  "volunteerId" | null,
    "front-right": "volunteerId" | null,
    "back-left":   "volunteerId" | null,
    "back-right":  "volunteerId" | null
  }
  updatedAt, updatedBy

aclDropLog/{autoId}                          # append-only, so drops are visible after the fact
  volunteerId, slotId, at, reason

aclAdmins/{uid}                              # presence = admin
```

**Slot ID convention:** `YYYY-MM-DD_HH-HH` → `2026-10-02_12-17`. Sorts correctly, human-readable in the console, and doubles as the grid row key.

Two layers is the whole point: when someone drops or flips their availability *after* being assigned, the grid can flag **"assigned but unavailable"** in red. Collapse them into one field and that state can't be represented — the drop just silently erases the assignment, and you find out on Oct 10.

---

## Firestore rules sketch

```js
function isAdmin() {
  return request.auth != null
      && exists(/databases/$(database)/documents/aclAdmins/$(request.auth.uid));
}
function myVolunteerId() {
  return request.auth.token.email.lower();   // or resolve via a uid→volunteer index
}

match /aclVolunteers/{id} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
  // first-time uid link only — same trick brb-schedule already uses on `baristas`
  allow update: if resource.data.uid == null
             && request.auth.token.email.lower() == resource.data.email
             && request.resource.data.diff(resource.data).affectedKeys()
                  .hasOnly(['uid','status','claimedAt']);
}

match /aclAvailability/{volunteerId} {
  allow read: if request.auth != null;
  allow write: if isAdmin() || volunteerId == myVolunteerId();
}

// a position may be left alone, or vacated by the person standing in it
function dropOk(k) {
  return request.resource.data.positions[k] == resource.data.positions[k]
      || (resource.data.positions[k] == myVolunteerId()
          && request.resource.data.positions[k] == null);
}

match /aclAssignments/{slotId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
  // a volunteer may vacate ONLY their own position — this is the "drop" action.
  // Four fixed keys, so enumerate them; rules have no loops.
  allow update: if request.auth != null
    && dropOk('front-left') && dropOk('front-right')
    && dropOk('back-left')  && dropOk('back-right');
}

match /aclDropLog/{id} {
  allow read: if isAdmin();
  allow create: if request.auth != null;
  allow update, delete: if false;
}
```

> ⚠️ **Firestore rules are ONE file per Firebase project.** `brb-website/` and `brb-subscriptions/` each carry their own copy, and `brb-schedule/README.md` references a `firestore.rules` that isn't actually in that repo. Deploying rules from any single repo **overwrites the entire project's rules**. Merge before `firebase deploy --only firestore:rules`.

---

## Invite & sign-in flow

1. Admin adds a volunteer (name + email) → `aclVolunteers` doc, `status: "invited"`.
2. Admin hits **Send invite** → `sendSignInLinkToEmail(auth, email, { url: 'https://acl.brbcoffee-atx.com/finish', handleCodeInApp: true })`. Fired straight from the admin's browser; **Firebase sends the email**, no Cloud Function in the loop.
3. Volunteer clicks the link → `/finish` → `isSignInWithEmailLink()` → `signInWithEmailLink()`. The email is cached in `localStorage` at send time; if they open it on a different device, prompt for it.
4. App matches their `request.auth.token.email` to the `aclVolunteers` doc, writes `uid` + `status: "active"` once (guarded by the rule above).
5. They land on the grid with their own column live.

**Setup prerequisites:** add `acl.brbcoffee-atx.com` to Firebase Auth → Settings → **Authorized domains**, and enable the **Email link (passwordless sign-in)** provider. Both are easy to forget and both fail loudly at the worst moment.

---

## Screens

| Route | Who | What |
|---|---|---|
| `/` | both | The grid. Volunteer: all columns visible, own availability editable, own assignments droppable. Admin: everything editable + layer toggle |
| `/finish` | volunteer | Magic-link landing; completes sign-in, links uid, redirects to `/` |
| `/station` | both | The floor plan with **names placed in the four positions**, driven by the schedule. Volunteers land on their own next shift with their position highlighted; admin can page through any day+shift. Tapping a position opens its briefing |
| `/admin` | admin | Volunteer roster — add, invite, resend, remove. Lock toggle. CSV export |

### Grid UI notes
- Sticky first column (day + shift) and sticky header row (names) — non-negotiable at 12×N.
- Layer toggle **Availability | Assignments** in the header, admin only. Volunteers see both at once: their availability editable, assignments read-only except drop.
- **Conflict badge** — assigned && !available → red outline + a count in the header.
- **Coverage row** at the bottom: filled positions vs 4 per slot, red when short — and *which* position is empty.
- Narrow screens: horizontal scroll with the sticky day column, not a layout reflow.
- `@dnd-kit` is already a `brb-schedule` dependency, but a 12-row grid probably wants **click-to-toggle**, not drag. Start with clicks.

---

## Build phases

- **0 — Scaffold.** Copy `brb-schedule`'s `Dockerfile`, `nginx.conf`, `nginx.https.conf`, `docker-entrypoint.d/`, `.github/workflows/deploy.yml`, `vite.config.js`, `src/firebase/config.js`. Rename `brb-schedule` → `brb-acl` throughout the workflow (image tag, tar name, container name) and change the port to `3006`. Seed `aclConfig/settings` with the 6 days and 2 shifts.
- **1 — Auth.** Email-link sign-in, `/finish`, uid linking, admin gate.
- **2 — Availability.** Grid renders; volunteers toggle their own column; writes to `aclAvailability`.
- **3 — Assignments.** Layer toggle, admin assigns, conflict detection, volunteer drop + drop log.
- **4 — Admin panel.** Roster, invites, lock, coverage summary, CSV export.
- **5 — Station tab.** The map component driven by real assignments, own-shift default, position highlight. Briefing copy as a constants module.
- **6 — Deploy.** DNS A record, Caddy block, first green Actions run.

---

## Deploy checklist

- DNS: `acl` A record → `18.191.96.186`
- Confirm 3006 is free on the box (`docker ps` — 3001 is brb-baristas, 3005 is brb-schedule)
- Caddy block: `acl.brbcoffee-atx.com { reverse_proxy 127.0.0.1:3006 }`, then reload caddy
  (the box uses Caddy as the host proxy — it issues TLS itself, no certbot)
- GitHub secrets: same set as brb-schedule (6× `FIREBASE_*`, `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, optional `EC2_SSH_PORT` / `EC2_HOST_KEY`)
- Firebase: authorized domain + email-link provider (see above)
- Merge and deploy `firestore.rules`

---

## Open / decide later

- Does headcount ever vary — is a Saturday 5–10 heavier than a Sunday 12–5, or is it 4 across the board?
- Does the admin get notified on a drop — email, or just a badge in the app on next login?
- What happens after the fest: archive the data and kill the container, or keep it for next year?
