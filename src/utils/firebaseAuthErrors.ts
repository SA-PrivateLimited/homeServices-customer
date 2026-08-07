/**
 * Map Firebase Auth / network errors to user-friendly messages (React Native).
 */

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as {code?: string}).code || '')
      : '';
  const message =
    error instanceof Error ? error.message : 'Something went wrong';

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Enter a valid mobile number with country code.';
    case 'auth/missing-phone-number':
      return 'Mobile number is required.';
    case 'auth/quota-exceeded':
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'OTP expired. Request a new code.';
    case 'auth/invalid-verification-code':
      return 'Invalid OTP. Check the code and try again.';
    case 'auth/missing-verification-code':
      return 'Enter the OTP sent to your phone.';
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return 'Security check failed. Try again, or check Firebase Phone Auth setup (SHA keys / Play Integrity).';
    case 'auth/app-not-authorized':
      return 'App not authorized for phone authentication. Add SHA-1/SHA-256 in Firebase Console.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is not enabled for this app. Contact support.';
    case 'auth/argument-error':
      return 'Could not start phone verification. Please try again.';
    default:
      if (/network/i.test(message)) {
        return 'Network error. Check your connection and try again.';
      }
      return message || 'Phone verification failed. Please try again.';
  }
}
