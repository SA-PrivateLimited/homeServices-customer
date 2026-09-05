/**
 * Customer reviews list — web ProviderDetailsPage review section parity.
 * Rating-only reviews (no comment) still render author / stars / date / service.
 */

import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {useTranslation} from 'react-i18next';
import {getProviderReviews, Review} from '../services/reviewService';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';
import {formatJobCalendarDate} from '../utils/dateDisplay';
import {localizedServiceName} from '../utils/serviceDisplay';

interface ReviewsListProps {
  providerId: string;
  showHeader?: boolean;
}

function tidyAuthor(raw?: string | null): string {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ReviewsList({
  providerId,
  showHeader = true,
}: ReviewsListProps) {
  const {isDarkMode, language} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!providerId) {
        setReviews([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const providerReviews = await getProviderReviews(providerId);
        if (!cancelled) {
          setReviews(Array.isArray(providerReviews) ? providerReviews : []);
        }
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [providerId]);

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
        <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
          {t('review.noReviewsYet') ||
            t('providers.noReviewsYet') ||
            'No reviews yet'}
        </Text>
      </View>
    );
  }

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(reviews.length, 1);

  return (
    <View>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: theme.text}]}>
            {t('review.customerReviews') || 'Customer reviews'} ({reviews.length})
          </Text>
          <Text style={[styles.averageRatingText, {color: theme.text}]}>
            ★ {avg.toFixed(1)}
          </Text>
        </View>
      ) : null}

      {reviews.map(review => {
        const comment = String(review.comment || '').trim();
        const service = String(review.serviceType || '').trim();
        const commentIsServiceTag =
          Boolean(comment) &&
          Boolean(service) &&
          comment.toLowerCase() === service.toLowerCase();
        const body = commentIsServiceTag ? '' : comment;
        const author = tidyAuthor(review.customerName);
        const when = review.createdAt
          ? formatJobCalendarDate(review.createdAt, language, '')
          : '';
        const stars =
          '★'.repeat(Math.max(0, Math.min(5, review.rating))) +
          '☆'.repeat(Math.max(0, 5 - review.rating));

        return (
          <View
            key={review.id || `${review.providerId}-${review.createdAt}`}
            style={[styles.reviewItem, {borderBottomColor: theme.border}]}>
            <View style={styles.reviewHead}>
              <View style={styles.reviewHeadMain}>
                {author ? (
                  <Text style={[styles.author, {color: theme.text}]}>
                    {author}
                  </Text>
                ) : null}
                <Text style={styles.stars} accessibilityLabel={`${review.rating} stars`}>
                  {stars}
                </Text>
              </View>
              {when ? (
                <Text style={[styles.when, {color: theme.textSecondary}]}>
                  {when}
                </Text>
              ) : null}
            </View>
            {body ? (
              <Text style={[styles.comment, {color: theme.text}]}>{body}</Text>
            ) : null}
            {service ? (
              <Text style={[styles.service, {color: theme.textSecondary}]}>
                {localizedServiceName(service)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  averageRatingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  reviewHeadMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  author: {
    fontSize: 14,
    fontWeight: '700',
  },
  stars: {
    fontSize: 13,
    letterSpacing: 1,
    color: '#D69E2E',
  },
  when: {
    fontSize: 12,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
  },
  service: {
    fontSize: 12,
    marginTop: 2,
  },
});
