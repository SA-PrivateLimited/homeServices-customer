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
    landmark?: string;
    city?: string;
    district?: string;
    state?: string;
    stateId?: string;
    districtId?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  serviceType: string;
  problem?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'rejected';
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
  completionPhotos?: Array<string | {key?: string; url?: string}>;
  cancellationReason?: string;
  rejectionReason?: string;
  rejectedAt?: string | Date;
  declinedProviders?: Array<{
    providerId: string;
    providerName?: string;
    providerPhone?: string;
    reason?: string;
    declinedAt?: string | Date;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
  cancelledAt?: string | Date;
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
 * Notify admin that providers are needed for a service type in the customer's local area
 */
export async function requestAreaProviders(data: {
  serviceType: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress: {
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
}): Promise<{serviceType: string; pincode: string}> {
  return apiPost('/customer/serviceRequests/request-area-providers', data);
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
 * Update an existing pending service request.
 */
export async function updateServiceRequest(
  serviceRequestId: string,
  data: Partial<ServiceRequest> & Record<string, unknown>,
): Promise<ServiceRequest> {
  return apiPut<ServiceRequest>(
    `/customer/serviceRequests/${serviceRequestId}`,
    data,
  );
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

export interface ActiveServiceRequestSummary {
  serviceRequestId: string;
  serviceType: string;
  status: string;
  providerId?: string | null;
  providerName?: string | null;
  createdAt?: string | Date | null;
}

/**
 * Active request for a service type (null when none).
 * Backend: GET /api/customer/serviceRequests/active?serviceType=
 */
export async function getActiveServiceRequest(
  serviceType: string,
): Promise<ActiveServiceRequestSummary | null> {
  try {
    const params = new URLSearchParams({serviceType});
    return await apiGet<ActiveServiceRequestSummary | null>(
      `/customer/serviceRequests/active?${params.toString()}`,
    );
  } catch (error: any) {
    if (
      error?.message?.includes('404') ||
      error?.message?.includes('not found')
    ) {
      return null;
    }
    throw error;
  }
}

export const serviceRequestsApi = {
  getById: getServiceRequestById,
  getAll: getServiceRequests,
  create: createServiceRequest,
  requestAreaProviders,
  updateStatus: updateServiceRequestStatus,
  cancel: cancelServiceRequest,
  findByConsultationId: findServiceRequestByConsultationId,
  getActive: getActiveServiceRequest,
  update: updateServiceRequest,
};
