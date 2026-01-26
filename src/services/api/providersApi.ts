/**
 * Providers API Service
 * Handles provider operations via backend API
 */

import {apiGet, apiPut} from './apiClient';

export interface Provider {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  specialization?: string;
  serviceCategories?: string[];
  experience?: number;
  serviceFee?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  verified?: boolean;
  rating?: number;
  totalReviews?: number;
  isOnline?: boolean;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  currentLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    updatedAt?: string | number | Date;
  };
  photos?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ProviderFilters {
  serviceType?: string;
  city?: string;
  state?: string;
  isOnline?: boolean;
  minRating?: number;
  limit?: number;
  offset?: number;
}

/**
 * Get all providers with optional filters
 */
export async function getProviders(filters?: ProviderFilters): Promise<Provider[]> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/providers?${queryString}` : '/providers';

    const response = await apiGet<{data: Provider[]; count: number}>(endpoint);
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching providers:', error);
    throw error;
  }
}

/**
 * Get provider by ID
 */
export async function getProviderById(providerId: string): Promise<Provider | null> {
  try {
    return await apiGet<Provider>(`/providers/${providerId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Update provider status (online/offline)
 */
export async function updateProviderStatus(data: {
  isOnline?: boolean;
  isAvailable?: boolean;
  currentLocation?: {latitude: number; longitude: number};
}): Promise<void> {
  await apiPut('/providers/me/status', data);
}

export const providersApi = {
  getAll: getProviders,
  getById: getProviderById,
  updateStatus: updateProviderStatus,
};
