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
    {phoneNumber},
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
      fullName: options?.fullName || 'Customer',
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
    {phoneNumber, pin},
    {skipAuth: true},
  );
}

export async function sendPhoneOtp(phoneNumber: string): Promise<{
  phoneNumber: string;
  status?: string;
  channel?: string;
  dev?: boolean;
  /** Present in TWILIO_DEV_MODE — show in-app banner */
  otp?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
}> {
  return apiPost(
    '/auth/phone/send-otp',
    {phoneNumber},
    {skipAuth: true},
  );
}

/** Forgot PIN / signup: verify OTP and set a user-chosen PIN. */
export async function resetPin(
  phoneNumber: string,
  code: string,
  pin: string,
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/reset-pin',
    {
      phoneNumber,
      code,
      pin,
    },
    {skipAuth: true},
  );
}

/** New number: verify OTP and create account with user-chosen PIN. */
export async function registerWithOtp(
  phoneNumber: string,
  code: string,
  pin: string,
  fullName?: string,
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/register-with-otp',
    {
      phoneNumber,
      code,
      pin,
      fullName: fullName || 'Customer',
    },
    {skipAuth: true},
  );
}
