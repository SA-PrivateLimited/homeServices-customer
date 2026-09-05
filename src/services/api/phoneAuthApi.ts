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

export async function enableCustomerProfile(
  phoneNumber: string,
  pin: string,
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/enable-customer-profile',
    {phoneNumber, pin},
    {skipAuth: true},
  );
}

export async function resetPin(
  phoneNumber: string,
  pin: string,
  opts: {idToken: string},
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/reset-pin',
    {phoneNumber, pin, idToken: opts.idToken},
    {skipAuth: true},
  );
}

export async function registerWithOtp(
  phoneNumber: string,
  pin: string,
  opts: {idToken: string; fullName?: string},
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/register-with-otp',
    {
      phoneNumber,
      pin,
      fullName: opts.fullName || '',
      role: 'customer',
      idToken: opts.idToken,
    },
    {skipAuth: true},
  );
}
