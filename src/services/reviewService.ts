/**
 * Review Service
 * Handles customer reviews for completed services
 * Uses HomeServicesBackend API for all database operations
 * Reviews are visible to both customer and provider
 * Providers cannot edit reviews
 */

import auth from '@react-native-firebase/auth';
import {reviewsApi, type Review as ReviewApi} from './api/reviewsApi';
import {jobCardsApi} from './api/jobCardsApi';

export interface Review {
  id?: string;
  jobCardId: string;
  serviceRequestId?: string; // consultationId for backward compatibility
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  serviceType: string;
  rating: number; // 1-5 stars
  comment?: string;
  photos?: string[]; // Optional photos
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Create a review for a completed job
 * Only customers can create reviews
 * Uses backend API
 */
export const createReview = async (
  jobCardId: string,
  rating: number,
  comment?: string,
  photos?: string[],
): Promise<string> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card details from API
    const jobCard = await jobCardsApi.getById(jobCardId);
    if (!jobCard) {
      throw new Error('Job card not found');
    }

    // Verify the job is completed
    if (jobCard.status !== 'completed') {
      throw new Error('Can only review completed jobs');
    }

    // Verify the current user is the customer
    if (jobCard.customerId !== currentUser.uid) {
      throw new Error('Only the customer can create a review');
    }

    // Check if review already exists via API
    const existingReview = await reviewsApi.getJobCardReview(jobCardId);
    if (existingReview) {
      throw new Error('Review already exists for this job');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Create review via backend API
    const reviewData: any = {
      providerId: jobCard.providerId,
      jobCardId,
      rating,
    };

    const trimmedComment = comment?.trim();
    if (trimmedComment && trimmedComment.length > 0) {
      reviewData.comment = trimmedComment;
    }

    if (photos && photos.length > 0) {
      reviewData.photos = photos;
    }

    const review = await reviewsApi.create(reviewData);
    return review._id || review.id || '';
  } catch (error: any) {
    console.error('Error creating review:', error);
    throw new Error(error.message || 'Failed to create review');
  }
};

/**
 * Get reviews for a provider
 * Uses backend API
 */
export const getProviderReviews = async (
  providerId: string,
): Promise<Review[]> => {
  try {
    const reviews = await reviewsApi.getProviderReviews(providerId);

    // Convert API response to app format
    return reviews.map((review: ReviewApi) => ({
      id: review._id || review.id,
      ...review,
      createdAt: review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt),
      updatedAt: review.updatedAt ? (review.updatedAt instanceof Date ? review.updatedAt : new Date(review.updatedAt)) : undefined,
    })) as Review[];
  } catch (error: any) {
    console.error('Error fetching provider reviews:', error);
    throw new Error(`Failed to fetch reviews: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Get reviews for a customer
 * Uses backend API
 */
export const getCustomerReviews = async (
  customerId: string,
): Promise<Review[]> => {
  try {
    const reviews = await reviewsApi.getCustomerReviews(customerId);

    // Convert API response to app format
    return reviews.map((review: ReviewApi) => ({
      id: review._id || review.id,
      ...review,
      createdAt: review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt),
      updatedAt: review.updatedAt ? (review.updatedAt instanceof Date ? review.updatedAt : new Date(review.updatedAt)) : undefined,
    })) as Review[];
  } catch (error: any) {
    console.error('Error fetching customer reviews:', error);
    throw new Error(`Failed to fetch reviews: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Get review for a specific job card
 * Uses backend API
 */
export const getJobCardReview = async (
  jobCardId: string,
): Promise<Review | null> => {
  try {
    const review = await reviewsApi.getJobCardReview(jobCardId);
    if (!review) {
      return null;
    }

    // Convert API response to app format
    return {
      id: review._id || review.id,
      ...review,
      createdAt: review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt),
      updatedAt: review.updatedAt ? (review.updatedAt instanceof Date ? review.updatedAt : new Date(review.updatedAt)) : undefined,
    } as Review;
  } catch (error) {
    console.error('Error fetching job card review:', error);
    return null;
  }
};

// Note: Provider rating update is now handled by the backend API
// when a review is created/updated/deleted

/**
 * Check if customer can review a job
 * Uses backend API
 */
export const canCustomerReview = async (
  jobCardId: string,
): Promise<boolean> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return false;
    }

    // Get job card from API
    const jobCard = await jobCardsApi.getById(jobCardId);
    if (!jobCard) {
      return false;
    }

    // Check if job is completed
    if (jobCard.status !== 'completed') {
      return false;
    }

    // Check if customer matches
    if (jobCard.customerId !== currentUser.uid) {
      return false;
    }

    // Check if review already exists
    const existingReview = await getJobCardReview(jobCardId);
    return !existingReview;
  } catch (error) {
    console.error('Error checking if customer can review:', error);
    return false;
  }
};

