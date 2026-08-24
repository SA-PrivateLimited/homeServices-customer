import {apiPost} from './apiClient';
import type {User} from './usersApi';

export interface PhoneLookupResult {
  phoneNumber: string;
  localPhone: string;
  exists: boolean;
  hasPin: boolean;
}

export interface PinAuthResult {
  user: User;
  token: string;
  pin?: string;
  expiresIn?: string;
}

export async function lookupPhone(
  phoneNumber: string,
): Promise<PhoneLookupResult> {
  return apiPost<PhoneLookupResult>(
    '/auth/phone/lookup',
    {phoneNumber, role: 'customer'},
    {skipAuth: true},
  );
}

export async function registerPin(
  phoneNumber: string,
  options?: {pin?: string; fullName?: string},
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/register-pin',
    {
      phoneNumber,
      pin: options?.pin,
      fullName: options?.fullName,
    },
    {skipAuth: true},
  );
}

export async function loginPin(
  phoneNumber: string,
  pin: string,
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/login-pin',
    {phoneNumber, pin, role: 'customer'},
    {skipAuth: true},
  );
}

/**
 * Optional probe — Firebase mode does not send SMS.
 * Prefer client Firebase Phone Auth for actual OTP delivery.
 */
export async function sendPhoneOtp(phoneNumber: string): Promise<{
  phoneNumber: string;
  provider?: string;
  status?: string;
  channel?: string;
  dev?: boolean;
  otp?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
}> {
  return apiPost('/auth/phone/send-otp', {phoneNumber}, {skipAuth: true});
}

/** Forgot PIN — Firebase idToken (or legacy Twilio code). */
export async function resetPin(
  phoneNumber: string,
  pin: string,
  opts: {idToken: string} | {code: string},
): Promise<PinAuthResult> {
  const body: Record<string, string> = {phoneNumber, pin};
  if ('idToken' in opts) body.idToken = opts.idToken;
  else body.code = opts.code;

  return apiPost<PinAuthResult>('/auth/phone/reset-pin', body, {
    skipAuth: true,
  });
}

/** Signup — Firebase idToken + chosen PIN (or legacy Twilio code). */
export async function registerWithOtp(
  phoneNumber: string,
  pin: string,
  opts: {idToken: string; fullName?: string} | {code: string; fullName?: string},
): Promise<PinAuthResult> {
  const body: Record<string, string> = {
    phoneNumber,
    pin,
    fullName: opts.fullName || '',
    role: 'customer',
  };
  if ('idToken' in opts) body.idToken = opts.idToken;
  else body.code = opts.code;

  return apiPost<PinAuthResult>('/auth/phone/register-with-otp', body, {
    skipAuth: true,
  });
}
