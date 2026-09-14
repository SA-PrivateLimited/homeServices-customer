/**
 * Users API Service
 * Handles all user operations via backend API
 */

import {apiGet, apiPut, apiDelete} from './apiClient';
import {uploadAssetFromUri} from './assetsApi';

export interface User {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  secondaryPhone?: string;
  secondaryPhoneVerified?: boolean;
  role?: 'customer' | 'provider' | 'admin';
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    updatedAt?: string | Date;
  };
  homeAddress?: {
    address?: string;
    landmark?: string;
    city?: string;
    district?: string;
    state?: string;
    stateId?: string;
    districtId?: string;
    pincode?: string;
    label?: string;
    customLabel?: string;
  };
  officeAddress?: {
    address?: string;
    landmark?: string;
    city?: string;
    district?: string;
    state?: string;
    stateId?: string;
    districtId?: string;
    pincode?: string;
    label?: string;
    customLabel?: string;
  };
  serviceAddresses?: Array<{
    id?: string;
    label?: 'home' | 'office' | 'other';
    customLabel?: string;
    address?: string;
    landmark?: string;
    city?: string;
    district?: string;
    state?: string;
    stateId?: string;
    districtId?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }>;
  profileImage?: string;
  photoURL?: string;
  gender?: string;
  customerDisplayId?: number | string | null;
  customerProfileComplete?: boolean;
  canSwitchToPartner?: boolean;
  bloodGroup?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Get current user profile
 */
export async function getMe(): Promise<User | null> {
  try {
    return await apiGet<User>('/users/me');
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Update current user profile
 */
export async function updateMe(updates: Partial<User>): Promise<User> {
  return apiPut<User>('/users/me', updates);
}

/**
 * Profile photo: upload-url (customer-profile) → PUT binary → PUT /users/me.
 * Same asset path as customer-web uploadMyProfileImage (RN URI, not File).
 */
export async function uploadMyProfileImage(
  localUri: string,
): Promise<{profileImage?: string; url?: string} & Partial<User>> {
  const uri = String(localUri || '').trim();
  if (!uri) {
    throw new Error('No photo selected');
  }
  const ref = await uploadAssetFromUri(uri, {
    purpose: 'customer-profile',
    fileName: 'profile.jpg',
    contentType: 'image/jpeg',
  });
  const user = await updateMe({
    profileImage: ref.url,
    photoURL: ref.url,
  });
  const url = user.profileImage || ref.url;
  return {...user, profileImage: url, url};
}

export async function updateFcmToken(userId: string, fcmToken: string): Promise<void> {
  await apiPut(`/users/${userId}/fcmToken`, {fcmToken});
}

/** Unlink device token from this user (logout / switch account). */
export async function clearFcmToken(
  userId: string,
  fcmToken?: string,
): Promise<void> {
  await apiDelete(
    `/users/${userId}/fcmToken${
      fcmToken ? `?fcmToken=${encodeURIComponent(fcmToken)}` : ''
    }`,
  );
}

/** Permanently delete the signed-in customer account. */
export async function deleteMe(): Promise<void> {
  await apiDelete('/users/me');
}

/**
 * Get user by ID (if needed for admin/provider endpoints)
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    return await apiGet<User>(`/users/${userId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

export const usersApi = {
  getMe,
  updateMe,
  uploadMyProfileImage,
  updateFcmToken,
  clearFcmToken,
  deleteMe,
  getById: getUserById,
};
