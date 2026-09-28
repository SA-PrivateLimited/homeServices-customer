import {useCallback, useEffect, useRef, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {mapFirebaseAuthError} from '../utils/firebaseAuthErrors';
import {
  BROWSER_REQUIRED_FOR_OTP_CODE,
  canOpenHttpsUrl,
} from '../utils/canOpenHttpsUrl';

type ConfirmationResult = FirebaseAuthTypes.ConfirmationResult;
type FirebaseUser = FirebaseAuthTypes.User;

const SEND_OTP_TIMEOUT_MS = 60_000;
const AUTO_VERIFY_WAIT_MS = 2_000;

function phoneTail(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function phonesMatch(a?: string | null, b?: string | null): boolean {
  const left = phoneTail(a);
  const right = phoneTail(b);
  return left.length === 10 && left === right;
}

function firebaseErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as {code?: string}).code || '');
  }
  return '';
}

function isConsumedOtpError(error: unknown): boolean {
  const code = firebaseErrorCode(error);
  return code === 'auth/code-expired' || code === 'auth/session-expired';
}

/**
 * Android Play Services often reads the SMS and signs the user in before they
 * type the code. confirm() then throws code/session-expired even though the
 * phone was just proved. Accept only a sign-in that happened for this send.
 */
function signedInForThisAttempt(
  user: FirebaseUser,
  e164: string,
  startedAt: number,
): boolean {
  const raw = user.metadata?.lastSignInTime;
  const signedInAt = raw ? Date.parse(raw) : NaN;
  if (!Number.isFinite(signedInAt)) return false;
  return signedInAt >= startedAt - 30_000;
}

/**
 * After sign-out, any matching Firebase user is this send (Android often
 * auto-signs-in from the SMS and leaves lastSignInTime unset). If sign-out
 * left the previous user in place, require a fresh lastSignInTime.
 */
function userProvedThisSend(
  user: FirebaseUser | null,
  e164: string | null,
  startedAt: number,
  uidBeforeSend: string | null,
): user is FirebaseUser {
  if (!user || !e164 || !phonesMatch(user.phoneNumber, e164)) return false;
  if (!uidBeforeSend || user.uid !== uidBeforeSend) return true;
  return signedInForThisAttempt(user, e164, startedAt);
}

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
  const sendLockRef = useRef(false);
  const verifyFlightRef = useRef<Promise<{uid: string}> | null>(null);
  const provedRef = useRef(false);
  const attemptStartedAtRef = useRef(0);
  const uidBeforeSendRef = useRef<string | null>(null);
  const watchUnsubRef = useRef<(() => void) | null>(null);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [autoVerified, setAutoVerified] = useState(false);

  const stopWatch = () => {
    watchUnsubRef.current?.();
    watchUnsubRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopWatch();
      confirmationRef.current = null;
      idTokenRef.current = null;
      lastPhoneRef.current = null;
      provedRef.current = false;
    };
  }, []);

  const reset = useCallback(async () => {
    stopWatch();
    confirmationRef.current = null;
    idTokenRef.current = null;
    lastPhoneRef.current = null;
    provedRef.current = false;
    attemptStartedAtRef.current = 0;
    uidBeforeSendRef.current = null;
    setPhoneE164(null);
    setAutoVerified(false);
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
    if (sendLockRef.current) {
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

    sendLockRef.current = true;
    setSending(true);
    try {
      confirmationRef.current = null;
      idTokenRef.current = null;
      provedRef.current = false;
      if (mountedRef.current) setAutoVerified(false);
      stopWatch();
      attemptStartedAtRef.current = Date.now();

      // Clear any half-finished Firebase session so a retry is not blocked by
      // "reCAPTCHA flow already in progress".
      try {
        if (auth().currentUser) {
          await auth().signOut();
        }
      } catch {
        /* ignore */
      }
      uidBeforeSendRef.current = auth().currentUser?.uid ?? null;

      const forceResend = lastPhoneRef.current === e164;
      watchUnsubRef.current = auth().onAuthStateChanged(user => {
        if (
          !userProvedThisSend(
            user,
            e164,
            attemptStartedAtRef.current,
            uidBeforeSendRef.current,
          )
        ) {
          return;
        }
        provedRef.current = true;
        if (mountedRef.current) setAutoVerified(true);
        void user.getIdToken(true).then(token => {
          if (provedRef.current) idTokenRef.current = token;
        }).catch(() => {
          /* token is read again from currentUser at PIN time */
        });
      });
      const confirmation = await withTimeout(
        auth().signInWithPhoneNumber(e164, forceResend),
        SEND_OTP_TIMEOUT_MS,
        'Phone verification',
      );

      confirmationRef.current = confirmation;
      lastPhoneRef.current = e164;
      const already = auth().currentUser;
      if (
        userProvedThisSend(
          already,
          e164,
          attemptStartedAtRef.current,
          uidBeforeSendRef.current,
        )
      ) {
        provedRef.current = true;
        if (mountedRef.current) setAutoVerified(true);
        try {
          idTokenRef.current = await already.getIdToken(true);
        } catch {
          /* currentUser remains available for getIdToken */
        }
      }
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
      sendLockRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  }, []);

  const verifyOtp = useCallback((code: string) => {
    if (verifyFlightRef.current) return verifyFlightRef.current;

    const flight = (async () => {
      const otp = String(code || '').trim();
      if (!/^\d{4,8}$/.test(otp)) {
        throw new Error('Enter the OTP sent to your phone.');
      }

      const acceptUser = async (user: FirebaseUser) => {
        const token = await user.getIdToken(true);
        idTokenRef.current = token;
        provedRef.current = true;
        confirmationRef.current = null;
        if (mountedRef.current) setAutoVerified(true);
        return {uid: user.uid};
      };

      setVerifying(true);
      try {
        const already = auth().currentUser;
        if (
          provedRef.current &&
          already &&
          phonesMatch(already.phoneNumber, lastPhoneRef.current)
        ) {
          return acceptUser(already);
        }
        if (
          userProvedThisSend(
            already,
            lastPhoneRef.current,
            attemptStartedAtRef.current,
            uidBeforeSendRef.current,
          )
        ) {
          return acceptUser(already);
        }

        const confirmation = confirmationRef.current;
        if (!confirmation) {
          throw new Error('Request a new OTP first.');
        }

        try {
          const credential = await confirmation.confirm(otp);
          if (!credential?.user) {
            throw new Error('OTP verification failed. Please try again.');
          }
          return acceptUser(credential.user);
        } catch (err) {
          if (!isConsumedOtpError(err)) throw err;
          const recovered = await new Promise<FirebaseUser | null>(resolve => {
            const existing = auth().currentUser;
            if (
              userProvedThisSend(
                existing,
                lastPhoneRef.current,
                attemptStartedAtRef.current,
                uidBeforeSendRef.current,
              )
            ) {
              resolve(existing);
              return;
            }
            let done = false;
            const finish = (user: FirebaseUser | null) => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              unsub();
              resolve(user);
            };
            const timer = setTimeout(() => {
              const user = auth().currentUser;
              finish(
                userProvedThisSend(
                  user,
                  lastPhoneRef.current,
                  attemptStartedAtRef.current,
                  uidBeforeSendRef.current,
                )
                  ? user
                  : null,
              );
            }, AUTO_VERIFY_WAIT_MS);
            const unsub = auth().onAuthStateChanged(user => {
              if (
                userProvedThisSend(
                  user,
                  lastPhoneRef.current,
                  attemptStartedAtRef.current,
                  uidBeforeSendRef.current,
                )
              ) {
                finish(user);
              }
            });
          });
          if (recovered) return acceptUser(recovered);
          throw err;
        }
      } catch (err) {
        if (err instanceof Error && !firebaseErrorCode(err)) throw err;
        idTokenRef.current = null;
        throw new Error(mapFirebaseAuthError(err));
      } finally {
        if (mountedRef.current) setVerifying(false);
      }
    })().finally(() => {
      if (verifyFlightRef.current === flight) verifyFlightRef.current = null;
    });

    verifyFlightRef.current = flight;
    return flight;
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
    autoVerified,
    hasConfirmation: () => Boolean(confirmationRef.current) || provedRef.current,
  };
}
