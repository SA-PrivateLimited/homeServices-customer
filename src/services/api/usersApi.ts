/**
 * Users API Service
 * Handles all user operations via backend API
 */

import {apiGet, apiPut, type RNUploadFile} from './apiClient';
import {uploadAssetFromUri} from './assetsApi';

export interface User {
  _id?: string;
  id?: string;
  name?: string;
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
  }>;
  profileImage?: string;
  gender?: string;
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

const MAX_PROFILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Profile photo: POST /assets/upload-url (customer-profile) → PUT binary → PUT /users/me.
 * Same S3 path as request photos. Does not send multipart or base64.
 */
export async function uploadMyProfileImage(
  file: RNUploadFile & {fileSize?: number},
): Promise<{profileImage?: string; url?: string} & Partial<User>> {
  const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (!ALLOWED_PROFILE_TYPES.has(type)) {
    throw new Error('Please choose a JPG, PNG, or WebP image.');
  }
  if (file.fileSize && file.fileSize > MAX_PROFILE_BYTES) {
    throw new Error('Please choose an image smaller than 5 MB.');
  }
  const ref = await uploadAssetFromUri(file.uri, {
    purpose: 'customer-profile',
    contentType: type,
    fileName: file.name || 'profile.jpg',
  });
  const user = await updateMe({profileImage: ref.url});
  const url = user.profileImage || ref.url;
  return {...user, profileImage: url, url};
}

export const usersApi = {
  getMe,
  updateMe,
  getById: getUserById,
  uploadMyProfileImage,
};
