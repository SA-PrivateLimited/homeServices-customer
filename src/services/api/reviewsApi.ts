/**
 * Reviews API Service
 * Handles all review operations via backend API
 */

import {apiGet, apiPost, apiPut, apiDelete} from './apiClient';

export interface Review {
  _id?: string;
  id?: string;
  jobCardId: string;
  serviceRequestId?: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  serviceType: string;
  rating: number; // 1-5
  comment?: string;
  photos?: string[];
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface CreateReviewData {
  providerId: string;
  jobCardId: string;
  rating: number;
  comment?: string;
  photos?: string[];
}

/**
 * Get reviews with optional filters
 */
export async function getReviews(filters?: {
  providerId?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<Review[]> {
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
    const endpoint = queryString ? `/reviews?${queryString}` : '/reviews';

    const response = await apiGet<{data: Review[]; count: number}>(endpoint);
    // Handle both array response and object with data property
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
}

/**
 * Get reviews for a provider
 */
export async function getProviderReviews(providerId: string): Promise<Review[]> {
  return getReviews({providerId});
}

/**
 * Get reviews for a customer
 */
export async function getCustomerReviews(customerId: string): Promise<Review[]> {
  return getReviews({customerId});
}

/**
 * Get review by ID
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  try {
    return await apiGet<Review>(`/reviews/${reviewId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get review for a specific job card
 */
export async function getJobCardReview(jobCardId: string): Promise<Review | null> {
  try {
    const reviews = await getReviews({customerId: ''}); // Get all, filter client-side
    // Or backend could support filtering by jobCardId
    // For now, get customer reviews and filter
    const review = reviews.find(r => r.jobCardId === jobCardId);
    return review || null;
  } catch (error) {
    console.error('Error fetching job card review:', error);
    return null;
  }
}

/**
 * Create a review
 */
export async function createReview(data: CreateReviewData): Promise<Review> {
  return apiPost<Review>('/reviews', data);
}

/**
 * Update review (customer can only update comment, not rating)
 */
export async function updateReview(
  reviewId: string,
  updates: {comment?: string},
): Promise<Review> {
  return apiPut<Review>(`/reviews/${reviewId}`, updates);
}

/**
 * Delete review
 */
export async function deleteReview(reviewId: string): Promise<void> {
  await apiDelete(`/reviews/${reviewId}`);
}

export const reviewsApi = {
  getAll: getReviews,
  getById: getReviewById,
  getProviderReviews,
  getCustomerReviews,
  getJobCardReview,
  create: createReview,
  update: updateReview,
  delete: deleteReview,
};
