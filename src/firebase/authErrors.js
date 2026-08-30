/**
 * Firebase auth error codes, said in plain language.
 *
 * Shared by the login screen and the admin roster so a failed invite reads
 * the same in both places — and so the two most common setup mistakes name
 * the exact console setting that's wrong, rather than printing a code.
 */
export function explainAuthError(err) {
  switch (err?.code) {
    case 'auth/operation-not-allowed':
      return 'Email-link sign-in isn’t enabled for this Firebase project. Turn on "Email link (passwordless sign-in)" under Auth → Sign-in method → Email/Password.'
    case 'auth/unauthorized-continue-uri':
      return 'This domain isn’t in Firebase’s authorized domains. Add it under Auth → Settings → Authorized domains.'
    case 'auth/invalid-email':
      return 'That doesn’t look like an email address.'
    case 'auth/invalid-action-code':
      return 'That link has already been used. Request a new one below.'
    case 'auth/expired-action-code':
      return 'That link has expired. Request a new one below.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.'
    case 'auth/network-request-failed':
      return 'Couldn’t reach Firebase. Check the connection and try again.'
    default:
      return `Sign-in failed${err?.code ? ` (${err.code})` : ''}.`
  }
}
