import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {Theme} from '../../utils/theme';
import useTranslation from '../../hooks/useTranslation';

type Props = {
  theme: Theme;
  label: string;
  locating?: boolean;
  onPress: () => void;
  /** Header row vs inline chip styling */
  variant?: 'header' | 'inline';
};

export function BrowseLocationChip({
  theme,
  label,
  locating = false,
  onPress,
  variant = 'header',
}: Props) {
  const {t} = useTranslation();
  const isHeader = variant === 'header';

  return (
    <TouchableOpacity
      style={[
        isHeader ? styles.headerRow : styles.inlineRow,
        isHeader
          ? {borderTopColor: theme.border}
          : {backgroundColor: 'rgba(49, 130, 206, 0.10)'},
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={String(t('browse.locationPrompt'))}>
      <Icon
        name="place"
        size={isHeader ? 16 : 18}
        color={theme.primary}
        style={styles.pin}
      />
      <Text
        style={[
          isHeader ? styles.headerLabel : styles.inlineLabel,
          {color: theme.text},
        ]}
        numberOfLines={1}>
        {locating ? String(t('ecosystem.locating')) : label}
      </Text>
      <View style={styles.trailing}>
        {!isHeader ? (
          <Text style={[styles.change, {color: theme.primary}]}>
            {t('browse.changeLocation')}
          </Text>
        ) : null}
        <Icon name="chevron-right" size={20} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    marginHorizontal: 14,
  },
  pin: {flexShrink: 0},
  headerLabel: {flex: 1, fontSize: 13, fontWeight: '600'},
  inlineLabel: {flex: 1, fontSize: 14, fontWeight: '600'},
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  change: {fontSize: 12, fontWeight: '700'},
});
