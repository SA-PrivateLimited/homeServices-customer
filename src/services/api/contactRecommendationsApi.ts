/**
 * Contact Recommendations API Service
 * Handles contact recommendation operations via backend API
 */

import {apiGet, apiPost} from './apiClient';

export interface ContactRecommendation {
  _id?: string;
  id?: string;
  recommendedProviderName: string;
  recommendedProviderPhone: string;
  serviceType: string;
  address?: string;
  recommendedBy: string;
  recommendedByName?: string;
  recommendedByPhone?: string;
  recommendedByRole: 'customer' | 'provider';
  status: 'pending' | 'contacted' | 'registered' | 'rejected';
  pointsAwarded: number;
  adminNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateContactRecommendationRequest {
  recommendedProviderName: string;
  recommendedProviderPhone: string;
  serviceType: string;
  address?: string;
}

/**
 * Create a new contact recommendation
 */
export async function createContactRecommendation(
  data: CreateContactRecommendationRequest,
): Promise<{data: ContactRecommendation; message: string; pointsAwarded: number}> {
  try {
    return await apiPost<{data: ContactRecommendation; message: string; pointsAwarded: number}>(
      '/contactRecommendations',
      data,
    );
  } catch (error) {
    console.error('Error creating contact recommendation:', error);
    throw error;
  }
}

/**
 * Get my contact recommendations
 */
export async function getMyContactRecommendations(): Promise<ContactRecommendation[]> {
  try {
    const response = await apiGet<{data: ContactRecommendation[]}>('/contactRecommendations/me');
    return Array.isArray(response) ? response : (response as any).data || [];
  } catch (error) {
    console.error('Error fetching my contact recommendations:', error);
    throw error;
  }
}

export const contactRecommendationsApi = {
  create: createContactRecommendation,
  getMyRecommendations: getMyContactRecommendations,
};
