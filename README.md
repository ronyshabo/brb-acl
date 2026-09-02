# brb-acl

Volunteer scheduling portal for BRB Coffee's ACL Fest presence.
Six days, two shifts a day, four volunteers per shift — 48 volunteer-shifts total.

Lives at **acl.brbcoffee-atx.com**. React 18 + Vite + Firebase, same shape as the
other BRB apps. Full reasoning is in [PLAN.md](PLAN.md).

---

## What it does

- **Schedule grid** — 12 day+shift rows × volunteer columns. Two stored layers:
  *availability* (each volunteer edits their own column) and *assignments* (admin
  places people into the four station positions). Keeping them separate is what
  makes an "assigned but now unavailable" conflict visible instead of silently lost.
- **Station tab** — the physical floor plan with names in the four positions for the
  shift you're looking at. Volunteers land on their own next shift. Tap a position
  for its briefing.
- **Roster** (admin) — add volunteers, send and resend magic-link invites, lock the
  schedule, export CSV.

## Sign-in

**Email and password.** No magic links, no verification email, no password to
set up in advance.

An invitation is a plain URL — `/join?email=…` — that the admin sends by hand
from the BRB Gmail using the **Copy** or **Gmail** button on the roster row. The
volunteer opens it, picks a password, and is in. Nothing in the sign-up path
touches Firebase's mailer.

That is deliberate. Firebase's built-in email sending has a daily cap that is
**not** listed in the Identity Toolkit quotas (twelve entries, none about email,
all reading 0% while sends were being refused), cannot be raised, and cannot be
monitored. An afternoon of testing exhausted it. The only Firebase email left is
password reset, which is rare — and an admin can also reset a password from the
Firebase console.

Admin rights hang off the **UID**: `isAclAdmin()` checks for an `aclAdmins/{uid}`
document, or the project's standing `isAdmin()`. How you authenticated is
irrelevant to what you can do.

Anyone can reach `/join`, but an account alone grants nothing — the roster gate
and the Firestore rules both key on being listed in `aclVolunteers`, and a
volunteer's document id **is** their lowercased email.

## Firestore

| Collection | Written by |
|---|---|
| `aclConfig/settings` | admin — lock flag |
| `aclVolunteers/{email}` | admin, plus one-time uid link by the volunteer |
| `aclAvailability/{email}` | each volunteer, own doc only |
| `aclAssignments/{slotId}` | admin; a volunteer may null out their own position |
| `aclDropLog/{autoId}` | append-only record of drops |
| `aclAdmins/{uid}` | Firebase console only |

A volunteer's document id **is** their lowercased email — the security rules depend
on that, so don't switch to random ids without rewriting `myVolunteerId()`.

> ⚠️ Firebase allows **one** `firestore.rules` per project. `brb-website` and
> `brb-subscriptions` have their own copies. Merge before
> `firebase deploy --only firestore:rules` or you'll wipe theirs.

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in Firebase values
npm run dev                        # http://localhost:5177
```

To see the admin tabs, create `aclAdmins/{your-uid}` in Firestore.

## Deploy

Push to `main` — `.github/workflows/deploy.yml` builds the image with the Firebase
values mounted as build secrets, ships it to EC2, and runs it on `127.0.0.1:3006`.

First time only:

- DNS `acl` A record → `18.191.96.186`
- add the block from [deploy/Caddyfile.snippet](deploy/Caddyfile.snippet) to the box's Caddyfile
  and `sudo systemctl reload caddy` — Caddy issues and renews TLS itself, no certbot
- GitHub secrets: six `FIREBASE_*`, `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`
  (optional `EC2_SSH_PORT`, `EC2_HOST_KEY`)
- Firebase: enable email-link sign-in, add the subdomain to authorized domains

See [acl-notes.txt](acl-notes.txt) for the short version.
