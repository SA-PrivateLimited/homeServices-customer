import {useCallback, useEffect, useRef, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {mapFirebaseAuthError} from '../utils/firebaseAuthErrors';

type ConfirmationResult = FirebaseAuthTypes.ConfirmationResult;

/**
 * Firebase Phone Auth for React Native — send OTP, verify code, get ID token.
 * Backend JWT is the app session; Firebase session is ephemeral.
 *
 * Lifecycle:
 * - Keep confirmation alive across sendOtp → OTP screen → verifyOtp
 * - Clear only on: unmount, reset(), failed send, or after backend accepts idToken
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

    setSending(true);
    try {
      confirmationRef.current = null;
      idTokenRef.current = null;

      const forceResend = lastPhoneRef.current === e164;
      const confirmation = await auth().signInWithPhoneNumber(
        e164,
        forceResend,
      );

      confirmationRef.current = confirmation;
      lastPhoneRef.current = e164;
      if (mountedRef.current) setPhoneE164(e164);
      return {phoneNumber: e164};
    } catch (err) {
      confirmationRef.current = null;
      throw new Error(mapFirebaseAuthError(err));
    } finally {
      if (mountedRef.current) setSending(false);
    }
  }, []);

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
