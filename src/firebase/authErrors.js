/**
 * Firebase auth error codes, said in plain language.
 *
 * Shared by sign-in, account creation and the admin roster so the same failure
 * reads the same everywhere, and so the setup mistakes name the console setting
 * that's wrong instead of printing a code.
 */
export function explainAuthError(err) {
  switch (err?.code) {
    // ── signing in ────────────────────────────────────────────────────────
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password don’t match an account. If you haven’t set a password yet, use the link in your invitation email.'
    case 'auth/user-disabled':
      return 'That account has been disabled. Ask an admin to re-enable it.'

    // ── creating an account ───────────────────────────────────────────────
    case 'auth/email-already-in-use':
      return 'There’s already an account for that email — sign in instead, or use “Forgot password”.'
    case 'auth/weak-password':
      return 'That password is too short. Use at least 6 characters.'
    case 'auth/invalid-email':
      return 'That doesn’t look like an email address.'
    case 'auth/admin-restricted-operation':
      return 'This project won’t create new accounts. Turn on Auth → Settings → User actions → "Enable create (sign-up)".'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in isn’t enabled for this Firebase project. Turn it on under Auth → Sign-in method.'

    // ── everything else ───────────────────────────────────────────────────
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.'
    case 'auth/quota-exceeded':
      return 'Firebase’s email quota is used up for now. Password sign-in still works — this only affects password reset emails.'
    case 'auth/network-request-failed':
      return 'Couldn’t reach Firebase. Check the connection and try again.'
    default:
      return `Something went wrong${err?.code ? ` (${err.code})` : ''}.`
  }
}
