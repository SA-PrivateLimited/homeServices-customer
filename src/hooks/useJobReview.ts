/**
 * Hook to handle job review prompts
 * Shows review modal when job is completed
 */

import {useState, useEffect} from 'react';
import {canCustomerReview, getJobCardReview} from '../services/reviewService';
import type {JobCard} from '../services/jobCardService';

export const useJobReview = (jobCard: JobCard | null) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    const checkReviewStatus = async () => {
      if (!jobCard || jobCard.status !== 'completed') {
        setShowReviewModal(false);
        return;
      }

      // Check if customer can review
      const canReview = await canCustomerReview(jobCard.id || '');
      
      if (canReview) {
        // Show review modal after a short delay
        setTimeout(() => {
          setShowReviewModal(true);
        }, 1000);
      } else {
        // Check if review already exists
        const existingReview = await getJobCardReview(jobCard.id || '');
        setHasReviewed(!!existingReview);
      }
    };

    checkReviewStatus();
  }, [jobCard]);

  return {
    showReviewModal,
    setShowReviewModal,
    hasReviewed,
  };
};

