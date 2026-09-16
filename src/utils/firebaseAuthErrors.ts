/**
 * Map Firebase Auth / network errors to user-friendly messages (React Native).
 */

import {BROWSER_REQUIRED_FOR_OTP_CODE} from './canOpenHttpsUrl';

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as {code?: string}).code || '')
      : '';
  const message =
    error instanceof Error ? error.message : 'Something went wrong';

  switch (code) {
    case BROWSER_REQUIRED_FOR_OTP_CODE:
      return BROWSER_REQUIRED_FOR_OTP_CODE;
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
    case 'auth/missing-client-identifier':
      return 'Phone verification could not start. Use a phone with Chrome, or confirm Play App Signing SHA-1/SHA-256 are added under Firebase → Akansho (com.akansho.customer).';
    case 'auth/app-not-authorized':
      return 'App not authorized for phone authentication. In Firebase → Project settings → Akansho (com.akansho.customer), add this build’s SHA-1/SHA-256 (including Play App Signing key).';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is not enabled for this app. Contact support.';
    case 'auth/argument-error':
      return 'Could not start phone verification. Please try again.';
    default:
      if (/ActivityNotFoundException|No Activity found to handle Intent/i.test(message)) {
        return BROWSER_REQUIRED_FOR_OTP_CODE;
      }
      if (/network/i.test(message)) {
        return 'Network error. Check your connection and try again.';
      }
      return message || 'Phone verification failed. Please try again.';
  }
}
