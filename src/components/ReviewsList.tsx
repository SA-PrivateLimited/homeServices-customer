/**
 * Reviews List Component
 * Displays reviews for a provider
 * Reviews are read-only for providers
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getProviderReviews, Review} from '../services/reviewService';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';

interface ReviewsListProps {
  providerId: string;
  showHeader?: boolean;
}

export default function ReviewsList({
  providerId,
  showHeader = true,
}: ReviewsListProps) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [providerId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const providerReviews = await getProviderReviews(providerId);
      // Ensure we have a valid array
      setReviews(Array.isArray(providerReviews) ? providerReviews : []);
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      // Set empty array on error to prevent crashes
      setReviews([]);
      // Show error message but don't throw - component will show empty state
      if (error.message?.includes('index')) {
        console.warn('Missing Firestore index. Please create index for reviews: providerId + createdAt');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Icon
            key={star}
            name={star <= rating ? 'star' : 'star-border'}
            size={16}
            color={star <= rating ? '#FFD700' : '#CCCCCC'}
          />
        ))}
      </View>
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="rate-review" size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
          No reviews yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: theme.text}]}>
            Reviews ({reviews.length})
          </Text>
          <View style={styles.averageRating}>
            <Icon name="star" size={20} color="#FFD700" />
            <Text style={[styles.averageRatingText, {color: theme.text}]}>
              {(
                reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              ).toFixed(1)}
            </Text>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {reviews.map(review => (
          <View
            key={review.id}
            style={[styles.reviewCard, {backgroundColor: theme.card}]}>
            {/* Review Header */}
            <View style={styles.reviewHeader}>
              <View style={styles.reviewHeaderLeft}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerInitial}>
                    {review.customerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.customerName, {color: theme.text}]}>
                    {review.customerName}
                  </Text>
                  <Text style={[styles.serviceType, {color: theme.textSecondary}]}>
                    {review.serviceType}
                  </Text>
                </View>
              </View>
              <View style={styles.reviewHeaderRight}>
                {renderStars(review.rating)}
                <Text style={[styles.reviewDate, {color: theme.textSecondary}]}>
                  {formatDate(review.createdAt)}
                </Text>
              </View>
            </View>

            {/* Review Comment */}
            {review.comment && (
              <Text style={[styles.reviewComment, {color: theme.text}]}>
                {review.comment}
              </Text>
            )}

            {/* Review Photos */}
            {review.photos && review.photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photosContainer}>
                {review.photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{uri: photo}}
                    style={styles.reviewPhoto}
                  />
                ))}
              </ScrollView>
            )}

            {/* Provider Cannot Edit Notice */}
            <View style={styles.readOnlyNotice}>
              <Icon name="lock" size={12} color={theme.textSecondary} />
              <Text style={[styles.readOnlyText, {color: theme.textSecondary}]}>
                Review cannot be edited
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  averageRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  averageRatingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  reviewCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceType: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewHeaderRight: {
    alignItems: 'flex-end',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  photosContainer: {
    marginBottom: 12,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  readOnlyText: {
    fontSize: 11,
  },
});

