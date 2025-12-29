/**
 * Review Service
 * Handles customer reviews for completed services
 * Reviews are visible to both customer and provider
 * Providers cannot edit reviews
 */

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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

const COLLECTIONS = {
  REVIEWS: 'reviews',
  JOBCARDS: 'jobCards',
};

/**
 * Create a review for a completed job
 * Only customers can create reviews
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

    // Get job card details
    const jobCardDoc = await firestore()
      .collection(COLLECTIONS.JOBCARDS)
      .doc(jobCardId)
      .get();

    if (!jobCardDoc.exists) {
      throw new Error('Job card not found');
    }

    const jobCard = jobCardDoc.data();

    // Verify the job is completed
    if (jobCard?.status !== 'completed') {
      throw new Error('Can only review completed jobs');
    }

    // Verify the current user is the customer
    if (jobCard?.customerId !== currentUser.uid) {
      throw new Error('Only the customer can create a review');
    }

    // Check if review already exists
    const existingReview = await firestore()
      .collection(COLLECTIONS.REVIEWS)
      .where('jobCardId', '==', jobCardId)
      .where('customerId', '==', currentUser.uid)
      .limit(1)
      .get();

    if (!existingReview.empty) {
      throw new Error('Review already exists for this job');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Create review
    const reviewRef = firestore().collection(COLLECTIONS.REVIEWS).doc();
    
    // Build review data, filtering out undefined values (Firestore doesn't allow undefined)
    const reviewData: any = {
      jobCardId,
      customerId: currentUser.uid,
      customerName: jobCard?.customerName || 'Customer',
      providerId: jobCard?.providerId || '',
      providerName: jobCard?.providerName || 'Provider',
      serviceType: jobCard?.serviceType || 'Service',
      rating,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    // Only add optional fields if they have values
    const consultationId = jobCard?.consultationId || jobCard?.bookingId;
    if (consultationId) {
      reviewData.serviceRequestId = consultationId;
    }

    const trimmedComment = comment?.trim();
    if (trimmedComment && trimmedComment.length > 0) {
      reviewData.comment = trimmedComment;
    }

    if (photos && photos.length > 0) {
      reviewData.photos = photos;
    }

    await reviewRef.set(reviewData);

    // Update provider's average rating
    await updateProviderRating(jobCard.providerId);

    return reviewRef.id;
  } catch (error: any) {
    console.error('Error creating review:', error);
    throw new Error(error.message || 'Failed to create review');
  }
};

/**
 * Get reviews for a provider
 */
export const getProviderReviews = async (
  providerId: string,
): Promise<Review[]> => {
  try {
    // Query without orderBy to avoid requiring a composite index
    // We'll sort client-side instead
    const snapshot = await firestore()
      .collection(COLLECTIONS.REVIEWS)
      .where('providerId', '==', providerId)
      .get();

    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        jobCardId: data?.jobCardId || '',
        serviceRequestId: data?.serviceRequestId,
        customerId: data?.customerId || '',
        customerName: data?.customerName || 'Customer',
        providerId: data?.providerId || '',
        providerName: data?.providerName || 'Provider',
        serviceType: data?.serviceType || 'Service',
        rating: data?.rating || 0,
        comment: data?.comment,
        photos: Array.isArray(data?.photos) ? data.photos : undefined,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate(),
      } as Review;
    });

    // Sort by createdAt descending (newest first)
    reviews.sort((a, b) => {
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });

    return reviews;
  } catch (error: any) {
    console.error('Error fetching provider reviews:', error);
    throw new Error(`Failed to fetch reviews: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Get reviews for a customer
 */
export const getCustomerReviews = async (
  customerId: string,
): Promise<Review[]> => {
  try {
    // Query without orderBy to avoid requiring a composite index
    // We'll sort client-side instead
    const snapshot = await firestore()
      .collection(COLLECTIONS.REVIEWS)
      .where('customerId', '==', customerId)
      .get();

    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        jobCardId: data?.jobCardId || '',
        serviceRequestId: data?.serviceRequestId,
        customerId: data?.customerId || '',
        customerName: data?.customerName || 'Customer',
        providerId: data?.providerId || '',
        providerName: data?.providerName || 'Provider',
        serviceType: data?.serviceType || 'Service',
        rating: data?.rating || 0,
        comment: data?.comment,
        photos: Array.isArray(data?.photos) ? data.photos : undefined,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate(),
      } as Review;
    });

    // Sort by createdAt descending (newest first)
    reviews.sort((a, b) => {
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });

    return reviews;
  } catch (error: any) {
    console.error('Error fetching customer reviews:', error);
    throw new Error(`Failed to fetch reviews: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Get review for a specific job card
 */
export const getJobCardReview = async (
  jobCardId: string,
): Promise<Review | null> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.REVIEWS)
      .where('jobCardId', '==', jobCardId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as Review;
  } catch (error) {
    console.error('Error fetching job card review:', error);
    return null;
  }
};

/**
 * Update provider's average rating
 */
const updateProviderRating = async (providerId: string): Promise<void> => {
  try {
    const reviews = await getProviderReviews(providerId);
    
    if (reviews.length === 0) {
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await firestore()
      .collection('providers')
      .doc(providerId)
      .update({
        rating: averageRating,
        totalReviews: reviews.length,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error('Error updating provider rating:', error);
    // Don't throw - rating update failure shouldn't block review creation
  }
};

/**
 * Check if customer can review a job
 */
export const canCustomerReview = async (
  jobCardId: string,
): Promise<boolean> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return false;
    }

    const jobCardDoc = await firestore()
      .collection(COLLECTIONS.JOBCARDS)
      .doc(jobCardId)
      .get();

    if (!jobCardDoc.exists) {
      return false;
    }

    const jobCard = jobCardDoc.data();

    // Check if job is completed
    if (jobCard?.status !== 'completed') {
      return false;
    }

    // Check if customer matches
    if (jobCard?.customerId !== currentUser.uid) {
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

