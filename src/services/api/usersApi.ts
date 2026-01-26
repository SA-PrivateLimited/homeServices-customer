/**
 * Users API Service
 * Handles all user operations via backend API
 */

import {apiGet, apiPut} from './apiClient';

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
    city?: string;
    state?: string;
    pincode?: string;
  };
  officeAddress?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
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

export const usersApi = {
  getMe,
  updateMe,
  getById: getUserById,
};
