/**
 * Job Cards API Service
 * Handles all job card operations via backend API
 */

import {apiGet, apiPost, apiPut, apiDelete} from './apiClient';

export interface JobCard {
  _id?: string;
  id?: string;
  providerId: string;
  providerName: string;
  providerAddress: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  serviceType: string;
  problem?: string;
  consultationId?: string;
  bookingId?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  taskPIN?: string;
  pinGeneratedAt?: string | Date;
  scheduledTime?: string | Date;
  cancellationReason?: string;
  jobCardPdfUrl?: string;
  serviceAmount?: number;
  materialsUsed?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface JobCardFilters {
  status?: string;
  customerId?: string;
  providerId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get job card by ID (customer endpoint)
 */
export async function getJobCardById(jobCardId: string): Promise<JobCard | null> {
  try {
    return await apiGet<JobCard>(`/customer/jobCards/${jobCardId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get all job cards with optional filters
 */
export async function getJobCards(filters?: JobCardFilters): Promise<JobCard[]> {
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
    const endpoint = queryString ? `/jobCards?${queryString}` : '/jobCards';

    const response = await apiGet<{data: JobCard[]; count: number}>(endpoint);
    // Backend returns {data: [...], count: number}, but we expect array
    // Check if response is array or object with data property
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching job cards:', error);
    throw error;
  }
}

/**
 * Get job cards for a customer (uses customer endpoint - filters by authenticated user)
 */
export async function getCustomerJobCards(customerId: string): Promise<JobCard[]> {
  try {
    // Customer endpoint automatically filters by authenticated user
    const response = await apiGet<{data: JobCard[]; count: number} | JobCard[]>('/customer/jobCards');
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching customer job cards:', error);
    throw error;
  }
}

/**
 * Update job card status
 */
export async function updateJobCardStatus(
  jobCardId: string,
  status: JobCard['status'],
  updates?: Partial<JobCard>,
): Promise<JobCard> {
  return apiPut<JobCard>(`/jobCards/${jobCardId}`, {
    status,
    ...updates,
  });
}

/**
 * Cancel job card with reason (customer endpoint)
 */
export async function cancelJobCard(
  jobCardId: string,
  cancellationReason: string,
): Promise<JobCard> {
  return apiPut<JobCard>(`/customer/jobCards/${jobCardId}/cancel`, {
    cancellationReason,
  });
}

/**
 * Create job card (provider/admin only)
 */
export async function createJobCard(data: Partial<JobCard>): Promise<JobCard> {
  return apiPost<JobCard>('/jobCards', data);
}

export const jobCardsApi = {
  getById: getJobCardById,
  getAll: getJobCards,
  getCustomerJobCards,
  updateStatus: updateJobCardStatus,
  cancel: cancelJobCard,
  create: createJobCard,
};
