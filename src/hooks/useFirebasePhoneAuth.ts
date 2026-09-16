import {useCallback, useEffect, useRef, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {mapFirebaseAuthError} from '../utils/firebaseAuthErrors';
import {
  BROWSER_REQUIRED_FOR_OTP_CODE,
  canOpenHttpsUrl,
} from '../utils/canOpenHttpsUrl';

type ConfirmationResult = FirebaseAuthTypes.ConfirmationResult;

const SEND_OTP_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out. Check your network, or install Chrome and try again.`,
        ),
      );
    }, ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Firebase Phone Auth for React Native — send OTP, verify code, get ID token.
 * Backend JWT is the app session; Firebase session is ephemeral.
 *
 * Do not flip `appVerificationDisabledForTesting` just because Linking cannot
 * probe a browser — that makes Firebase reject real numbers as invalid.
 * If no browser can handle https VIEW, fail fast with a clear error instead of
 * letting RecaptchaActivity hang / crash the sendOtp promise.
 */
export function useFirebasePhoneAuth() {
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const idTokenRef = useRef<string | null>(null);
  const lastPhoneRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      confirmationRef.current = null;
      idTokenRef.current = null;
      lastPhoneRef.current = null;
    };
  }, []);

  const reset = useCallback(async () => {
    confirmationRef.current = null;
    idTokenRef.current = null;
    lastPhoneRef.current = null;
    setPhoneE164(null);
    try {
      if (auth().currentUser) {
        await auth().signOut();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const sendOtp = useCallback(async (phoneNumber: string) => {
    const e164 = String(phoneNumber || '').trim();
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      throw new Error('Enter a valid mobile number with country code.');
    }
    if (sending) {
      throw new Error('Phone verification is already in progress. Please wait a moment and try again.');
    }

    /**
     * When Play Integrity is unavailable (common on emulators), Firebase opens
     * RecaptchaActivity → browser Intent. No browser → native crash (guarded) and
     * a hung JS promise / stuck Continue spinner. Fail before that.
     */
    const browserOk = await canOpenHttpsUrl();
    if (!browserOk) {
      const err = new Error(BROWSER_REQUIRED_FOR_OTP_CODE) as Error & {
        code: string;
      };
      err.code = BROWSER_REQUIRED_FOR_OTP_CODE;
      throw err;
    }

    setSending(true);
    try {
      confirmationRef.current = null;
      idTokenRef.current = null;

      // Clear any half-finished Firebase session so a retry is not blocked by
      // "reCAPTCHA flow already in progress".
      try {
        if (auth().currentUser) {
          await auth().signOut();
        }
      } catch {
        /* ignore */
      }

      const forceResend = lastPhoneRef.current === e164;
      const confirmation = await withTimeout(
        auth().signInWithPhoneNumber(e164, forceResend),
        SEND_OTP_TIMEOUT_MS,
        'Phone verification',
      );

      confirmationRef.current = confirmation;
      lastPhoneRef.current = e164;
      if (mountedRef.current) setPhoneE164(e164);
      return {phoneNumber: e164};
    } catch (err) {
      confirmationRef.current = null;
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as {code?: string}).code === BROWSER_REQUIRED_FOR_OTP_CODE
      ) {
        throw err;
      }
      const mapped = mapFirebaseAuthError(err);
      const next = new Error(mapped) as Error & {code?: string};
      if (mapped === BROWSER_REQUIRED_FOR_OTP_CODE) {
        next.code = BROWSER_REQUIRED_FOR_OTP_CODE;
      }
      throw next;
    } finally {
      if (mountedRef.current) setSending(false);
    }
  }, [sending]);

  const verifyOtp = useCallback(async (code: string) => {
    const otp = String(code || '').trim();
    if (!/^\d{4,8}$/.test(otp)) {
      throw new Error('Enter the OTP sent to your phone.');
    }
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      throw new Error('Request a new OTP first.');
    }

    setVerifying(true);
    try {
      const credential = await confirmation.confirm(otp);
      if (!credential?.user) {
        throw new Error('OTP verification failed. Please try again.');
      }
      const token = await credential.user.getIdToken(true);
      idTokenRef.current = token;
      return {uid: credential.user.uid};
    } catch (err) {
      idTokenRef.current = null;
      throw new Error(mapFirebaseAuthError(err));
    } finally {
      if (mountedRef.current) setVerifying(false);
    }
  }, []);

  const getIdToken = useCallback(async (): Promise<string> => {
    if (idTokenRef.current) {
      const token = idTokenRef.current;
      idTokenRef.current = null;
      return token;
    }

    const user = auth().currentUser;
    if (!user) {
      throw new Error('Verify the OTP before continuing.');
    }
    return user.getIdToken(true);
  }, []);

  return {
    sendOtp,
    verifyOtp,
    getIdToken,
    reset,
    sending,
    verifying,
    phoneE164,
    hasConfirmation: () => Boolean(confirmationRef.current),
  };
}
