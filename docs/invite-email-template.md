# Firebase auth email template — ACL volunteer invite

Firebase Console → Authentication → Templates → **Email address sign-in**

Paste the three fields below. Takes effect immediately, no deploy.

---

## Sender name

```
BRB Coffee — ACL Volunteers
```

## Reply-to

```
brbcafeatx@gmail.com
```

Worth setting. A real reply address helps deliverability, and the copy below
tells people to just hit reply — which only works if this points somewhere.

## Subject

```
Volunteer with BRB Coffee at ACL
```

## Message body

```
Hi,

We're thrilled to invite you to volunteer with BRB Coffee at Austin City
Limits this year! We'll be serving up our specialty drinks as a VIP food
vendor at Zilker Park across both weekends (Oct 2 to 4 and Oct 9 to 11),
and we'd love to have you on the team.

It's going to be a blast: great music, good energy, and a crew we're
excited to build. Whether you can jump in for a shift or two or ride out
the whole festival with us, every bit of help means the world.

Here's how to get started:

1. Click this link to sign in — no password needed:

   %LINK%

2. On the Schedule page, make sure the "Availability" view is selected —
   it opens there by default
3. Find your name along the top of the grid, then click every shift you
   can work across both weekends
4. We'll build the schedule from everyone's availability and you'll see
   exactly where and when you're working

You can update your availability any time right in the portal, and if
something changes after shifts go out, you can release one and we'll see it.

If you have any questions, just reply to this email and we'll get you
sorted. Can't wait to see you at Zilker!

Cheers,

BRB Coffee
acl.brbcoffee-atx.com
```

---

## Two changes from the original draft, and why

**1. The link replaced "go to the portal and sign in."**
The original said to visit acl.brbcoffee-atx.com and sign in with this email
address. That works — they'd land on the login screen and request their own
link — but it makes the emailed link pointless and adds a step. `%LINK%`
signs them straight in.

**2. "Pick the shifts that work for you" → "mark the shifts you're free for."**
This one is a real mismatch worth a decision. The original copy promises
self-service: *pick your shifts*, *once you've claimed your slots*. The app
does not work that way — volunteers mark **availability**, and the admin
assigns people to positions. A volunteer can edit their availability and drop
a shift they've been given, but cannot claim an open one.

So the original wording would have set an expectation the portal then refuses.
Two ways to resolve it:

- keep the app as-is and use the wording above (what's written here), or
- change the permission model so volunteers can self-claim open shifts

The second is a real product change — it was decided against early on, when
the call was that the admin does all assigning. Worth revisiting only if you
actually want volunteers picking their own slots.

---

## Still missing, and why

No logo, no first name, and the sender is still
`noreply@brb-coffee-dev.firebaseapp.com`. Firebase's template supports only
`%LINK%`, `%EMAIL%`, `%APP_NAME%` and `%DISPLAY_NAME%` — and DISPLAY_NAME is
always empty here, because the Auth user does not exist until after the link
is clicked. The roster name lives in Firestore, which the template cannot read.

Personalization and branding both require sending the mail ourselves:
a Cloud Function calling `generateSignInWithEmailLink()` (returns the link
without sending), then Resend or SendGrid from volunteers@brbcoffee-atx.com,
plus SPF/DKIM/DMARC at Namecheap. Needs the Blaze plan.

Better wording and a real reply-to often clear Gmail's filter on their own —
test it before assuming you need the full build.
