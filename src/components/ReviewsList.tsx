/**
 * Customer reviews list — collapsed by default; expand shows ≤5, then Show more.
 * Rating-only reviews (no comment) still render author / stars / date / service.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {getProviderReviews, Review} from '../services/reviewService';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';
import {formatJobCalendarDate} from '../utils/dateDisplay';
import {localizedServiceName} from '../utils/serviceDisplay';

/** Max reviews shown after first expand, before "Show more". */
const INITIAL_EXPANDED_REVIEW_COUNT = 5;

interface ReviewsListProps {
  providerId: string;
  showHeader?: boolean;
  /** Optional preformatted summary e.g. "★ 4.4 · 11 reviews" from parent. */
  summaryLabel?: string;
  /** Start collapsed (default true). */
  collapsedByDefault?: boolean;
}

function tidyAuthor(raw?: string | null): string {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ReviewsList({
  providerId,
  showHeader = true,
  summaryLabel,
  collapsedByDefault = true,
}: ReviewsListProps) {
  const {isDarkMode, language} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const [showAll, setShowAll] = useState(false);

  // Only fetch when the section is opened the first time — no refetch on toggle.
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    void (async () => {
      if (!providerId || loaded) return;
      setLoading(true);
      try {
        const providerReviews = await getProviderReviews(providerId);
        if (!cancelled) {
          setReviews(Array.isArray(providerReviews) ? providerReviews : []);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setReviews([]);
          setLoaded(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, providerId, loaded]);

  // Reset list state when navigating to a different provider.
  useEffect(() => {
    setReviews([]);
    setLoaded(false);
    setLoading(false);
    setExpanded(!collapsedByDefault);
    setShowAll(false);
  }, [providerId, collapsedByDefault]);

  const visibleReviews = useMemo(() => {
    if (showAll || reviews.length <= INITIAL_EXPANDED_REVIEW_COUNT) {
      return reviews;
    }
    return reviews.slice(0, INITIAL_EXPANDED_REVIEW_COUNT);
  }, [reviews, showAll]);

  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const computedSummary =
    summaryLabel ||
    (loaded && reviews.length > 0
      ? `★ ${avg.toFixed(1)} · ${reviews.length} ${
          reviews.length === 1
            ? String(t('providers.review') || 'review')
            : String(t('providers.reviews') || 'reviews')
        }`
      : '');

  const toggleExpanded = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
  };

  const renderReview = (review: Review) => {
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
            <Text
              style={styles.stars}
              accessibilityLabel={`${review.rating} stars`}>
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
  };

  return (
    <View>
      {showHeader ? (
        <Pressable
          onPress={toggleExpanded}
          style={styles.headerToggle}
          accessibilityRole="button"
          accessibilityState={{expanded}}>
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              {t('review.customerReviews') || 'Customer reviews'}
            </Text>
            {computedSummary ? (
              <Text style={[styles.averageRatingText, {color: theme.textSecondary}]}>
                {computedSummary}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.toggleLabel, {color: theme.primary}]}>
            {expanded
              ? String(t('review.hideReviews') || 'Hide reviews')
              : String(t('review.showReviews') || 'Show reviews')}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={toggleExpanded}
          style={styles.headerToggle}
          accessibilityRole="button"
          accessibilityState={{expanded}}>
          <Text style={[styles.toggleLabel, {color: theme.primary}]}>
            {expanded
              ? String(t('review.hideReviews') || 'Hide reviews')
              : String(t('review.showReviews') || 'Show reviews')}
          </Text>
        </Pressable>
      )}

      {!expanded ? null : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
            {t('review.noReviewsYet') ||
              t('providers.noReviewsYet') ||
              'No reviews yet'}
          </Text>
        </View>
      ) : (
        <View>
          {visibleReviews.map(renderReview)}
          {!showAll && reviews.length > INITIAL_EXPANDED_REVIEW_COUNT ? (
            <Pressable
              onPress={() => setShowAll(true)}
              style={styles.showMoreBtn}
              accessibilityRole="button">
              <Text style={[styles.showMoreText, {color: theme.primary}]}>
                {String(
                  t('review.showMoreReviews') || 'Show more reviews',
                )}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
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
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  averageRatingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 0,
  },
  showMoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '700',
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
