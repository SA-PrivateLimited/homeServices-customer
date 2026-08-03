/**
 * Backend JWT session for customer app (phone + PIN).
 * Remembers phone for 30 days so revisit asks for PIN only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {User} from './api/usersApi';

export const JWT_STORAGE_KEY = 'hs_customer_jwt';
export const USER_STORAGE_KEY = 'hs_customer_user';
export const SESSION_EXPIRES_KEY = 'hs_customer_session_expires';
export const REMEMBERED_PHONE_KEY = 'hs_customer_remembered_phone';
export const REMEMBERED_DIAL_KEY = 'hs_customer_remembered_dial';
export const REMEMBERED_EXPIRES_KEY = 'hs_customer_remembered_expires';

/** Default cache: 30 days */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface RememberedPhone {
  phoneLocal: string;
  dialCode: string;
  fullPhone: string;
  expiresAt: number;
}

export async function getStoredJwt(): Promise<string | null> {
  try {
    const expiresRaw = await AsyncStorage.getItem(SESSION_EXPIRES_KEY);
    if (expiresRaw) {
      const expiresAt = Number(expiresRaw);
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        await clearSession();
        return null;
      }
    }
    return await AsyncStorage.getItem(JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setSession(
  token: string,
  user: User,
  ttlMs: number = SESSION_TTL_MS,
): Promise<void> {
  const expiresAt = Date.now() + ttlMs;
  await AsyncStorage.multiSet([
    [JWT_STORAGE_KEY, token],
    [USER_STORAGE_KEY, JSON.stringify(user)],
    [SESSION_EXPIRES_KEY, String(expiresAt)],
  ]);

  const phoneLocal = String(user.phone || '')
    .replace(/\D/g, '')
    .slice(-10);
  const phoneE164 = String(user.phoneNumber || user.phone || '');
  let dialCode = '+91';
  if (phoneE164.startsWith('+') && phoneLocal) {
    dialCode = phoneE164.slice(0, phoneE164.length - phoneLocal.length) || '+91';
  }
  if (phoneLocal.length === 10) {
    await rememberPhone(phoneLocal, dialCode, ttlMs);
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    JWT_STORAGE_KEY,
    USER_STORAGE_KEY,
    SESSION_EXPIRES_KEY,
  ]);
}

/** Clears session and remembered phone (switch number / full wipe). */
export async function clearAllCredentials(): Promise<void> {
  await AsyncStorage.multiRemove([
    JWT_STORAGE_KEY,
    USER_STORAGE_KEY,
    SESSION_EXPIRES_KEY,
    REMEMBERED_PHONE_KEY,
    REMEMBERED_DIAL_KEY,
    REMEMBERED_EXPIRES_KEY,
  ]);
}

/**
 * Customer logout: clear JWT session only.
 * Keeps remembered phone (30 days) so next visit asks for PIN only.
 */
export async function logoutCustomer(): Promise<void> {
  await clearSession();
  // Also clear legacy store key used by zustand hydrate()
  await AsyncStorage.removeItem('currentUser');
}

export async function rememberPhone(
  phoneLocal: string,
  dialCode: string,
  ttlMs: number = SESSION_TTL_MS,
): Promise<void> {
  const local = phoneLocal.replace(/\D/g, '').slice(-10);
  if (local.length !== 10) return;
  const expiresAt = Date.now() + ttlMs;
  await AsyncStorage.multiSet([
    [REMEMBERED_PHONE_KEY, local],
    [REMEMBERED_DIAL_KEY, dialCode || '+91'],
    [REMEMBERED_EXPIRES_KEY, String(expiresAt)],
  ]);
}

export async function getRememberedPhone(): Promise<RememberedPhone | null> {
  try {
    const [[, phone], [, dial], [, expiresRaw]] = await AsyncStorage.multiGet([
      REMEMBERED_PHONE_KEY,
      REMEMBERED_DIAL_KEY,
      REMEMBERED_EXPIRES_KEY,
    ]);
    if (!phone) return null;
    const expiresAt = Number(expiresRaw || 0);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      await AsyncStorage.multiRemove([
        REMEMBERED_PHONE_KEY,
        REMEMBERED_DIAL_KEY,
        REMEMBERED_EXPIRES_KEY,
      ]);
      return null;
    }
    const dialCode = dial || '+91';
    return {
      phoneLocal: phone,
      dialCode,
      fullPhone: `${dialCode}${phone}`,
      expiresAt,
    };
  } catch {
    return null;
  }
}

export async function readStoredUser(): Promise<User | null> {
  try {
    const jwt = await getStoredJwt();
    if (!jwt) return null;
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function normalizeUser(user: User): User {
  const id = user.id || user._id || (user as any).uid || '';
  return {
    ...user,
    id,
    _id: user._id || id,
    phone: user.phone || user.phoneNumber,
    phoneNumber: user.phoneNumber || user.phone,
    phoneVerified: user.phoneVerified !== false,
  };
}

/** Mongo / session user id (phone auth — not Firebase uid). */
export function getUserId(user: any | null | undefined): string | null {
  if (!user) return null;
  const id = user.id || user._id || user.uid;
  return id ? String(id) : null;
}
