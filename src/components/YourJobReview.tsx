/**
 * Customer's own rating for a completed job — stars + optional comment.
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export type YourJobReviewData = {
  rating: number;
  comment?: string | null;
};

type ThemeColors = {
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  primary: string;
};

type Props = {
  review: YourJobReviewData;
  theme: ThemeColors;
  title: string;
  /** Compact row for list cards (no title card chrome). */
  compact?: boolean;
};

function Stars({rating, size = 18}: {rating: number; size?: number}) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <View style={styles.starsRow} accessibilityLabel={`${filled} of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Icon
          key={n}
          name={n <= filled ? 'star' : 'star-border'}
          size={size}
          color="#F5A623"
        />
      ))}
    </View>
  );
}

export default function YourJobReview({
  review,
  theme,
  title,
  compact = false,
}: Props) {
  const comment = String(review.comment || '').trim();
  const rating = Number(review.rating) || 0;

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <Stars rating={rating} size={16} />
        <Text style={[styles.compactLabel, {color: theme.textSecondary}]}>
          {title}
          {rating > 0 ? ` · ${rating}/5` : ''}
        </Text>
        {comment ? (
          <Text
            style={[styles.compactComment, {color: theme.text}]}
            numberOfLines={2}>
            {comment}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {backgroundColor: theme.card, borderColor: theme.border},
      ]}>
      <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      <View style={styles.ratingRow}>
        <Stars rating={rating} size={22} />
        <Text style={[styles.ratingText, {color: theme.text}]}>
          {rating}/5
        </Text>
      </View>
      {comment ? (
        <Text style={[styles.comment, {color: theme.textSecondary}]}>
          {comment}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
  },
  comment: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  compactWrap: {
    marginTop: 8,
    gap: 4,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactComment: {
    fontSize: 13,
    lineHeight: 18,
  },
});
