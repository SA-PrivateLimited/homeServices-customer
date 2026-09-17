/**
 * Device-local, account-bound biometric unlock for Customer login.
 *
 * Does not store fingerprints or templates. Android Keystore holds a
 * per-phone PIN credential; OS biometrics are required to read it.
 * A JS flag is only an enrollment index — never proof of authentication.
 */
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {
  BIOMETRIC_PIN_RE,
  BIOMETRIC_UNLOCK_TIMEOUT_MS,
  bindingServiceId,
  biometricFlagKey,
  biometricSkipKey,
  classifyKeychainError,
  logBiometricEvent,
  normalizeBindingPhone,
  type AuthPrompt,
  type BiometryKind,
  type EnrollResult,
  type UnlockResult,
} from './biometricBinding';

export {
  bindingServiceId,
  classifyKeychainError,
  normalizeBindingPhone,
} from './biometricBinding';
export type {
  AuthPrompt,
  BiometricFailReason,
  BiometryKind,
  EnrollResult,
  UnlockResult,
} from './biometricBinding';

let opInFlight = false;

export function isBiometricOpInFlight(): boolean {
  return opInFlight;
}

function accessOptions(service: string, prompt?: AuthPrompt): Keychain.Options {
  const options: Keychain.Options = {
    service,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
  };
  if (Platform.OS === 'android') {
    options.storage = Keychain.STORAGE_TYPE.RSA;
  }
  if (prompt) {
    options.authenticationPrompt = {
      title: prompt.title,
      subtitle: prompt.subtitle,
      cancel: prompt.cancel,
    };
  }
  return options;
}

export async function getBiometryKind(): Promise<BiometryKind | null> {
  try {
    const type = await Keychain.getSupportedBiometryType();
    if (
      type === Keychain.BIOMETRY_TYPE.FINGERPRINT ||
      type === Keychain.BIOMETRY_TYPE.TOUCH_ID
    ) {
      return 'fingerprint';
    }
    if (
      type === Keychain.BIOMETRY_TYPE.FACE ||
      type === Keychain.BIOMETRY_TYPE.FACE_ID
    ) {
      return 'face';
    }
    if (
      type === Keychain.BIOMETRY_TYPE.IRIS ||
      type === Keychain.BIOMETRY_TYPE.OPTIC_ID
    ) {
      return 'iris';
    }
    return null;
  } catch {
    return null;
  }
}

export async function hasBinding(phone: string): Promise<boolean> {
  const service = bindingServiceId(phone);
  if (!service) {
    return false;
  }
  try {
    const flagged = await AsyncStorage.getItem(biometricFlagKey(service));
    if (flagged === '1') {
      return true;
    }
  } catch {
    // continue to keychain index
  }
  try {
    const services = await Keychain.getAllGenericPasswordServices();
    return Array.isArray(services) && services.includes(service);
  } catch {
    return false;
  }
}

export async function wasOfferSkipped(phone: string): Promise<boolean> {
  const service = bindingServiceId(phone);
  if (!service) {
    return false;
  }
  try {
    return (await AsyncStorage.getItem(biometricSkipKey(service))) === '1';
  } catch {
    return false;
  }
}

export async function markOfferSkipped(phone: string): Promise<void> {
  const service = bindingServiceId(phone);
  if (!service) {
    return;
  }
  await AsyncStorage.setItem(biometricSkipKey(service), '1');
}

export async function clearOfferSkipped(phone: string): Promise<void> {
  const service = bindingServiceId(phone);
  if (!service) {
    return;
  }
  await AsyncStorage.removeItem(biometricSkipKey(service));
}

async function writeBinding(
  phone: string,
  pin: string,
  prompt?: AuthPrompt,
): Promise<EnrollResult> {
  const service = bindingServiceId(phone);
  const username = normalizeBindingPhone(phone);
  if (!service || !username || !BIOMETRIC_PIN_RE.test(pin)) {
    return {ok: false, reason: 'error'};
  }
  try {
    const result = await Keychain.setGenericPassword(
      username,
      pin,
      accessOptions(service, prompt),
    );
    if (!result) {
      return {ok: false, reason: 'failed'};
    }
    await AsyncStorage.setItem(biometricFlagKey(service), '1');
    await AsyncStorage.removeItem(biometricSkipKey(service));
    return {ok: true};
  } catch (error) {
    const reason = classifyKeychainError(error);
    logBiometricEvent(`credential write failed: ${reason}`);
    return {ok: false, reason};
  }
}

export async function enrollBiometric(
  phone: string,
  pin: string,
  prompt: AuthPrompt,
): Promise<EnrollResult> {
  if (opInFlight) {
    return {ok: false, reason: 'busy'};
  }
  const kind = await getBiometryKind();
  if (!kind) {
    return {ok: false, reason: 'unavailable'};
  }
  opInFlight = true;
  logBiometricEvent('enrollment started');
  try {
    const result = await writeBinding(phone, pin, prompt);
    logBiometricEvent(result.ok ? 'enrollment succeeded' : 'enrollment failed');
    return result;
  } finally {
    opInFlight = false;
  }
}

/** Refresh stored PIN for an enrolled account. Never deletes the binding on failure. */
export async function updateStoredPin(phone: string, pin: string): Promise<void> {
  if (!BIOMETRIC_PIN_RE.test(pin) || !(await hasBinding(phone))) {
    return;
  }
  const result = await writeBinding(phone, pin);
  if (!result.ok) {
    logBiometricEvent('stored pin update skipped; binding kept');
  }
}

export async function clearBinding(phone: string): Promise<void> {
  const service = bindingServiceId(phone);
  if (!service) {
    return;
  }
  try {
    await Keychain.resetGenericPassword({service});
  } catch {
    // ignore
  }
  try {
    await AsyncStorage.multiRemove([
      biometricFlagKey(service),
      biometricSkipKey(service),
    ]);
  } catch {
    // ignore
  }
  logBiometricEvent('credential cleared');
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('unavailable')), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function unlockWithBiometrics(
  phone: string,
  prompt: AuthPrompt,
): Promise<UnlockResult> {
  if (opInFlight) {
    return {ok: false, reason: 'busy'};
  }
  const expectedPhone = normalizeBindingPhone(phone);
  const service = bindingServiceId(phone);
  if (!expectedPhone || !service) {
    return {ok: false, reason: 'error'};
  }
  const kind = await getBiometryKind();
  if (!kind) {
    return {ok: false, reason: 'unavailable'};
  }
  if (!(await hasBinding(phone))) {
    return {ok: false, reason: 'not_enrolled'};
  }

  opInFlight = true;
  logBiometricEvent('authentication started');
  try {
    const creds = await withTimeout(
      Keychain.getGenericPassword(accessOptions(service, prompt)),
      BIOMETRIC_UNLOCK_TIMEOUT_MS,
    );
    if (!creds) {
      logBiometricEvent('authentication failed');
      return {ok: false, reason: 'failed'};
    }
    const boundPhone = normalizeBindingPhone(creds.username);
    if (!boundPhone || boundPhone !== expectedPhone) {
      logBiometricEvent('authentication mismatch');
      return {ok: false, reason: 'mismatch'};
    }
    if (!BIOMETRIC_PIN_RE.test(creds.password)) {
      await clearBinding(phone);
      logBiometricEvent('credential invalidated');
      return {ok: false, reason: 'invalidated'};
    }
    logBiometricEvent('authentication succeeded');
    return {ok: true, pin: creds.password, phone: expectedPhone};
  } catch (error) {
    const reason = classifyKeychainError(error);
    logBiometricEvent(
      reason === 'cancelled'
        ? 'authentication cancelled'
        : reason === 'invalidated'
          ? 'credential invalidated'
          : 'authentication failed',
    );
    if (reason === 'invalidated' || reason === 'not_enrolled') {
      await clearBinding(phone);
    }
    return {ok: false, reason};
  } finally {
    opInFlight = false;
  }
}

export async function shouldOfferBiometric(phone: string): Promise<boolean> {
  if (!(await getBiometryKind())) {
    return false;
  }
  if (await hasBinding(phone)) {
    return false;
  }
  return !(await wasOfferSkipped(phone));
}
