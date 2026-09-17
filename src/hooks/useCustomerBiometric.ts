import {useCallback, useRef, useState} from 'react';
import {
  enrollBiometric,
  getBiometryKind,
  hasBinding,
  markOfferSkipped,
  shouldOfferBiometric,
  unlockWithBiometrics,
  updateStoredPin,
  type BiometricFailReason,
  type BiometryKind,
} from '../services/biometricAuth';
import {normalizeBindingPhone} from '../services/biometricBinding';

type Translate = (key: string, options?: Record<string, unknown>) => string;

const FAIL_KEYS: Record<BiometricFailReason, string> = {
  cancelled: 'login.biometricCancelled',
  failed: 'login.biometricFailed',
  unavailable: 'login.biometricUnavailable',
  not_enrolled: 'login.biometricNotEnrolled',
  invalidated: 'login.biometricInvalidated',
  mismatch: 'login.biometricMismatch',
  busy: 'login.checkingBiometric',
  error: 'login.biometricFailed',
};

export function useCustomerBiometric(t: Translate) {
  const [kind, setKind] = useState<BiometryKind | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preferPin, setPreferPin] = useState(false);
  const phoneRef = useRef('');
  const busyRef = useRef(false);

  const prompt = useCallback(
    () => ({
      title: String(t('login.biometricPromptTitle')),
      cancel: String(t('login.biometricPromptCancel')),
    }),
    [t],
  );

  const probe = useCallback(async (phone: string) => {
    phoneRef.current = phone;
    const nextKind = await getBiometryKind();
    const nextEnrolled = nextKind ? await hasBinding(phone) : false;
    if (phoneRef.current !== phone) {
      return;
    }
    setKind(nextKind);
    setEnrolled(nextEnrolled);
    setPreferPin(false);
  }, []);

  const resetUi = useCallback(() => {
    busyRef.current = false;
    setBusy(false);
    setMessage(null);
    setPreferPin(false);
    setEnrolled(false);
  }, []);

  const authenticate = useCallback(
    async (phone: string): Promise<string | null> => {
      if (busyRef.current) {
        return null;
      }
      const selected = normalizeBindingPhone(phone);
      busyRef.current = true;
      setBusy(true);
      setMessage(null);
      try {
        const result = await unlockWithBiometrics(phone, prompt());
        if (normalizeBindingPhone(phoneRef.current) !== selected) {
          return null;
        }
        if (!result.ok) {
          setEnrolled(
            result.reason !== 'not_enrolled' && result.reason !== 'invalidated',
          );
          setPreferPin(true);
          if (result.reason !== 'busy') {
            setMessage(String(t(FAIL_KEYS[result.reason])));
          }
          return null;
        }
        if (result.phone !== selected) {
          setPreferPin(true);
          setMessage(String(t('login.biometricMismatch')));
          return null;
        }
        setMessage(null);
        return result.pin;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [prompt, t],
  );

  const enroll = useCallback(
    async (phone: string, pin: string): Promise<boolean> => {
      if (busyRef.current) {
        return false;
      }
      busyRef.current = true;
      setBusy(true);
      setMessage(null);
      try {
        const result = await enrollBiometric(phone, pin, prompt());
        if (!result.ok) {
          if (result.reason !== 'cancelled' && result.reason !== 'busy') {
            setMessage(String(t('login.biometricEnrollFailed')));
          }
          return false;
        }
        setEnrolled(true);
        return true;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [prompt, t],
  );

  const skipOffer = useCallback(async (phone: string) => {
    await markOfferSkipped(phone);
  }, []);

  const syncPin = useCallback(async (phone: string, pin: string) => {
    await updateStoredPin(phone, pin);
  }, []);

  const canOffer = useCallback(async (phone: string) => {
    return shouldOfferBiometric(phone);
  }, []);

  const canOfferAfterPinSetup = useCallback(async (phone: string) => {
    if (!(await getBiometryKind())) {
      return false;
    }
    return !(await hasBinding(phone));
  }, []);

  const unlockLabel =
    kind === 'face'
      ? String(t('login.useFaceUnlock'))
      : String(t('login.useFingerprint'));

  return {
    kind,
    enrolled,
    busy,
    message,
    preferPin,
    setPreferPin,
    setMessage,
    probe,
    resetUi,
    authenticate,
    enroll,
    skipOffer,
    syncPin,
    canOffer,
    canOfferAfterPinSetup,
    unlockLabel,
    checkingLabel: String(t('login.checkingBiometric')),
  };
}
