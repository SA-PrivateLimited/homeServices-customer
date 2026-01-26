/**
 * Service Requests API Service
 * Handles all service request/consultation operations via backend API
 */

import {apiGet, apiPost, apiPut} from './apiClient';

export interface ServiceRequest {
  _id?: string;
  id?: string;
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
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  urgency?: 'immediate' | 'scheduled';
  scheduledTime?: string | Date;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerSpecialization?: string;
  providerRating?: number;
  providerImage?: string;
  providerAddress?: any;
  consultationId?: string;
  questionnaireAnswers?: any;
  photos?: string[];
  cancellationReason?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ServiceRequestFilters {
  status?: string;
  customerId?: string;
  providerId?: string;
  serviceType?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get service request by ID (customer endpoint)
 */
export async function getServiceRequestById(serviceRequestId: string): Promise<ServiceRequest | null> {
  try {
    return await apiGet<ServiceRequest>(`/customer/serviceRequests/${serviceRequestId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get all service requests with optional filters
 */
export async function getServiceRequests(filters?: ServiceRequestFilters): Promise<ServiceRequest[]> {
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
    const endpoint = queryString ? `/customer/serviceRequests?${queryString}` : '/customer/serviceRequests';

    const response = await apiGet<{data: ServiceRequest[]; count: number} | ServiceRequest[]>(endpoint);
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching service requests:', error);
    throw error;
  }
}

/**
 * Create a new service request
 */
export async function createServiceRequest(data: Partial<ServiceRequest>): Promise<ServiceRequest> {
  return apiPost<ServiceRequest>('/customer/serviceRequests', data);
}

/**
 * Update service request status
 */
export async function updateServiceRequestStatus(
  serviceRequestId: string,
  status: ServiceRequest['status'],
  updates?: Partial<ServiceRequest>,
): Promise<ServiceRequest> {
  return apiPut<ServiceRequest>(`/customer/serviceRequests/${serviceRequestId}`, {
    status,
    ...updates,
  });
}

/**
 * Cancel service request with reason
 */
export async function cancelServiceRequest(
  serviceRequestId: string,
  cancellationReason: string,
): Promise<ServiceRequest> {
  return apiPut<ServiceRequest>(`/customer/serviceRequests/${serviceRequestId}/cancel`, {
    cancellationReason,
  });
}

/**
 * Find service request by consultation ID
 */
export async function findServiceRequestByConsultationId(
  consultationId: string,
): Promise<ServiceRequest | null> {
  try {
    const requests = await getServiceRequests({limit: 1});
    const request = requests.find(r => r.consultationId === consultationId || r._id === consultationId || r.id === consultationId);
    return request || null;
  } catch (error) {
    console.error('Error finding service request by consultation ID:', error);
    return null;
  }
}

export const serviceRequestsApi = {
  getById: getServiceRequestById,
  getAll: getServiceRequests,
  create: createServiceRequest,
  updateStatus: updateServiceRequestStatus,
  cancel: cancelServiceRequest,
  findByConsultationId: findServiceRequestByConsultationId,
};
