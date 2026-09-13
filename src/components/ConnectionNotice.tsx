/**
 * Connection-failure surface — web `ConnectionNotice` parity.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from 'sapvt-ltd-app-packages';
import EmptyState from './EmptyState';
import useTranslation from '../hooks/useTranslation';
import {
  connectionFailureMessage,
  type ConnectionFailureKind,
} from '../utils/userFacingError';

type Props = {
  kind: ConnectionFailureKind;
  onRetry: () => void;
  emptyTitle?: string;
  emptyIcon?: string;
};

export function ConnectionNotice({
  kind,
  onRetry,
  emptyTitle,
  emptyIcon = 'search-outline',
}: Props) {
  const {t} = useTranslation();
  const message = connectionFailureMessage(kind);
  const tryAgain = String(t('actions.tryAgain') || 'Try again');

  if (emptyTitle) {
    return (
      <View style={styles.empty}>
        <EmptyState icon={emptyIcon} title={emptyTitle} message={message} />
        <Button variant="primary" title={tryAgain} onPress={onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>{message}</Text>
      <Button variant="secondary" title={tryAgain} onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {paddingHorizontal: 16, paddingVertical: 24, gap: 12},
  banner: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    gap: 8,
  },
  bannerText: {fontSize: 14, lineHeight: 20, color: '#744210'},
});
