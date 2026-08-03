/**
 * Auth helpers — MongoDB + JWT only (no Firebase).
 */

import type {User} from './api/usersApi';
import {usersApi} from './api/usersApi';
import {
  clearSession,
  getStoredJwt,
  logoutCustomer,
  normalizeUser,
  readStoredUser,
  setSession,
} from './session';
import type {UserLocation} from '../types/common';

const PIN_LOGIN_MSG =
  'Firebase Auth is disabled. Use phone number + PIN login.';

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const jwt = await getStoredJwt();
    if (!jwt) return null;

    const me = await usersApi.getMe();
    if (me) {
      const normalized = normalizeUser(me);
      await setSession(jwt, normalized);
      return normalized;
    }

    const stored = await readStoredUser();
    return stored ? normalizeUser(stored) : null;
  } catch {
    const stored = await readStoredUser();
    return stored ? normalizeUser(stored) : null;
  }
};

export const updateUserProfile = async (
  _userId: string,
  updates: Partial<User>,
): Promise<User> => {
  const updated = await usersApi.updateMe(updates);
  const normalized = normalizeUser(updated);
  const jwt = await getStoredJwt();
  if (jwt) {
    await setSession(jwt, normalized);
  }
  return normalized;
};

export const removeSecondaryPhone = async (): Promise<void> => {
  await usersApi.updateMe({
    secondaryPhone: undefined,
    secondaryPhoneVerified: false,
  } as Partial<User>);
};

export const updateUserLocation = async (
  _userId: string,
  location: UserLocation,
): Promise<User> => {
  return updateUserProfile(_userId, {location: location as any});
};

export const logout = async (): Promise<void> => {
  await logoutCustomer();
};

export const isAuthenticated = async (): Promise<boolean> => {
  return !!(await getStoredJwt());
};

export const signUpWithEmail = async (): Promise<never> => {
  throw new Error(PIN_LOGIN_MSG);
};

export const loginWithEmail = async (): Promise<never> => {
  throw new Error(PIN_LOGIN_MSG);
};

export const sendPhoneVerificationCode = async (): Promise<never> => {
  throw new Error(PIN_LOGIN_MSG);
};

export const verifyPhoneCode = async (): Promise<never> => {
  throw new Error(PIN_LOGIN_MSG);
};

export const verifySecondaryPhoneCode = async (): Promise<never> => {
  throw new Error(PIN_LOGIN_MSG);
};

export const changeUserRole = async (): Promise<never> => {
  throw new Error('Role changes are managed by admin.');
};

export const updateUserRole = async (): Promise<never> => {
  throw new Error('Role changes are managed by admin.');
};

export const resetPassword = async (): Promise<never> => {
  throw new Error(PIN_LOGIN_MSG);
};

export const onAuthStateChanged = (
  callback: (user: User | null) => void,
): (() => void) => {
  let cancelled = false;
  void (async () => {
    const user = await getCurrentUser();
    if (!cancelled) callback(user);
  })();
  return () => {
    cancelled = true;
  };
};

const authService = {
  getCurrentUser,
  updateUserProfile,
  removeSecondaryPhone,
  updateUserLocation,
  logout,
  isAuthenticated,
  signUpWithEmail,
  loginWithEmail,
  sendPhoneVerificationCode,
  verifyPhoneCode,
  verifySecondaryPhoneCode,
  changeUserRole,
  updateUserRole,
  resetPassword,
  onAuthStateChanged,
  clearSession,
};

export default authService;
