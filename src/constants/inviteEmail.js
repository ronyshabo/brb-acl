// The invitation Rony sends by hand from the BRB Gmail account.
//
// It links to /join, where a volunteer sets a password and is straight in.
// Nothing here touches Firebase's mailer — no magic link, no verification
// email — so the invisible daily email cap can't break sign-ups.

const PORTAL = 'https://acl.brbcoffee-atx.com'

export const INVITE_SUBJECT = 'Volunteer with BRB Coffee at ACL'

/** "Maya Ortiz" -> "Maya". Falls back to the address when no name is set. */
export function firstNameOf(volunteer) {
  const name = (volunteer?.name || '').trim()
  if (name) return name.split(/\s+/)[0]

  const local = (volunteer?.email || volunteer?.id || '').split('@')[0]
  if (!local) return 'there'
  const word = local.split(/[._\-+0-9]+/).filter(Boolean)[0] || local
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export function buildInviteBody(volunteer) {
  const first = firstNameOf(volunteer)
  const email = volunteer?.email || volunteer?.id || ''
  // The address must match their roster entry exactly — it IS their document
  // id — so it's carried in the link rather than retyped from memory.
  const link = `${PORTAL}/join?email=${encodeURIComponent(email)}`

  return `Hi ${first},

We're thrilled to invite you to volunteer with BRB Coffee at Austin City Limits this year! We'll be serving up our specialty drinks as a VIP food vendor at Zilker Park across both weekends (Oct 2 to 4 and Oct 9 to 11), and we'd love to have you on the team.

It's going to be a blast: great music, good energy, and a crew we're excited to build. Whether you can jump in for a shift or two or ride out the whole festival with us, every bit of help means the world.

Here's how to get started:

1. Create your account here: ${link}
2. Pick a password — that's it, there's nothing to confirm and no link to wait for
3. On the Schedule page, make sure the "Availability" view is selected — it opens there by default
4. Find your name along the top of the grid, then click every shift you can work across both weekends
5. That's it — just close the window. Everything saves as you click, there's nothing to submit

Next time, sign in at ${PORTAL} with the same email and password.

We'll build the schedule from everyone's availability, and you'll be able to see exactly where and when you're working. You can update it any time.

If you have any questions, just reply to this email and we'll get you sorted. Can't wait to see you at Zilker!

Cheers,

BRB Coffee
${PORTAL}`
}

/** Opens Gmail's compose window with to/subject/body already filled in. */
export function gmailComposeUrl(volunteer) {
  const p = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: volunteer?.email || volunteer?.id || '',
    su: INVITE_SUBJECT,
    body: buildInviteBody(volunteer),
  })
  return `https://mail.google.com/mail/?${p.toString()}`
}
