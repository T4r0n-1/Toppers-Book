export function authMessage(error) {
  const messages = {
    'auth/popup-closed-by-user': 'The Google sign-in window was closed. You can try again.',
    'auth/popup-blocked': 'Allow the sign-in popup in your browser, then try again.',
    'auth/cancelled-popup-request': 'A sign-in window is already open. Please complete it.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/unauthorized-domain': 'Sign-in is not available on this address yet. Please contact support.',
    'auth/operation-not-allowed': 'This sign-in option is not enabled yet. Please contact support.',
    'auth/invalid-api-key': 'Sign-in is temporarily unavailable. Please contact support.',
    'auth/network-request-failed': 'Check your internet connection, then try again.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Use a stronger password with at least 8 characters.',
    'auth/password-does-not-meet-requirements': 'Your password does not meet the account security requirements. Please use a stronger password.',
    'auth/email-already-in-use': 'An account may already use this email. Try signing in, Google sign-in, or Forgot password.',
    'auth/account-exists-with-different-credential': 'Try the sign-in method you originally used for this email.',
    'auth/invalid-credential': 'The email or password could not be verified. Try again or use Forgot password.',
    'auth/user-not-found': 'The email or password could not be verified. Try again or use Forgot password.',
    'auth/wrong-password': 'The email or password could not be verified. Try again or use Forgot password.',
    'auth/user-disabled': 'This account cannot sign in. Please contact support.'
  };
  return messages[error?.code] || 'Sign-in could not be completed. Please try again or contact support.';
}

export async function emailAuthentication(sdk, auth, mode, email, password, continueUrl) {
  if (mode !== 'signin' && mode !== 'signup') throw new Error('Invalid authentication mode.');
  if (mode === 'signin') {
    const result = await sdk.signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, verificationSent: false };
  }
  if (password.length < 8) { const error = new Error('Password too short.'); error.code = 'auth/weak-password'; throw error; }
  const result = await sdk.createUserWithEmailAndPassword(auth, email, password);
  let verificationSent = false;
  // The account may exist even if sending the verification email is throttled.
  // Keep the user in the verification view instead of suggesting another signup.
  try { await sdk.sendEmailVerification(result.user, { url: continueUrl }); verificationSent = true; } catch { /* The user can resend from the verification view. */ }
  return { user: result.user, verificationSent };
}

export async function passwordReset(sdk, auth, email, continueUrl) {
  try { await sdk.sendPasswordResetEmail(auth, email, { url: continueUrl }); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  // Never disclose whether the address is registered.
  return 'If an account uses this email, a password reset link will arrive shortly. Check your inbox and spam folder.';
}

export function profileInput(nameValue, phoneValue) {
  const name = String(nameValue || '').trim().replace(/\s+/g, ' ');
  const raw = String(phoneValue || '').replace(/[\s()+-]/g, '');
  const phone = raw.startsWith('91') && raw.length === 12 ? raw.slice(2) : raw;
  if (name.length < 2 || name.length > 80 || /[\x00-\x1f<>]/.test(name)) throw new Error('Enter your full name using 2 to 80 characters.');
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Enter a valid 10-digit Indian mobile number.');
  return { name, phone };
}
