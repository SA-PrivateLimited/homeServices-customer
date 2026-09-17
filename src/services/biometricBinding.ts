export const BIOMETRIC_SERVICE_PREFIX = 'com.akansho.customer.bio.';
export const BIOMETRIC_FLAG_PREFIX = 'hs_customer_bio_on.';
export const BIOMETRIC_SKIP_PREFIX = 'hs_customer_bio_skip.';
export const BIOMETRIC_PIN_RE = /^\d{4}$/;
export const BIOMETRIC_UNLOCK_TIMEOUT_MS = 60_000;

export type BiometryKind = 'fingerprint' | 'face' | 'iris';

export type BiometricFailReason =
  | 'cancelled'
  | 'failed'
  | 'unavailable'
  | 'not_enrolled'
  | 'invalidated'
  | 'mismatch'
  | 'busy'
  | 'error';

export type UnlockResult =
  | {ok: true; pin: string; phone: string}
  | {ok: false; reason: BiometricFailReason};

export type EnrollResult =
  | {ok: true}
  | {ok: false; reason: BiometricFailReason};

export type AuthPrompt = {
  title: string;
  subtitle?: string;
  cancel?: string;
};

export function bindingServiceId(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  const local = digits.slice(-10);
  if (local.length !== 10) {
    return '';
  }
  const cc = digits.length > 10 ? digits.slice(0, digits.length - 10) : '91';
  return `${BIOMETRIC_SERVICE_PREFIX}${cc}${local}`;
}

export function normalizeBindingPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  const local = digits.slice(-10);
  if (local.length !== 10) {
    return '';
  }
  const cc = digits.length > 10 ? digits.slice(0, digits.length - 10) : '91';
  return `+${cc}${local}`;
}

export function classifyKeychainError(error: unknown): BiometricFailReason {
  const raw = error as {message?: string; code?: string; err?: string};
  const text = `${raw?.code || ''} ${raw?.message || ''} ${raw?.err || ''}`.toLowerCase();
  if (
    /cancel|user canceled|user cancelled|negative.?button|code 13|error 13|error 10/.test(
      text,
    )
  ) {
    return 'cancelled';
  }
  if (/invalidat|key permanently|keystore.*reset/.test(text)) {
    return 'invalidated';
  }
  if (/not enrolled|no fingerprint|no biometr/.test(text)) {
    return 'not_enrolled';
  }
  if (/unavailable|not available|lockout|too many|hw.?unavailable/.test(text)) {
    return 'unavailable';
  }
  return 'failed';
}

export function logBiometricEvent(event: string): void {
  if (__DEV__) {
    console.log(`[biometric] ${event}`);
  }
}

export function biometricFlagKey(serviceId: string): string {
  return `${BIOMETRIC_FLAG_PREFIX}${serviceId}`;
}

export function biometricSkipKey(serviceId: string): string {
  return `${BIOMETRIC_SKIP_PREFIX}${serviceId}`;
}
