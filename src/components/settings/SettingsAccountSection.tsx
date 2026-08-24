import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type {Theme} from '../../utils/theme';
import {commonStyles} from '../../utils/theme';

export interface SettingsAccountSectionProps {
  theme: Theme;
  title: string;
  actionLabel: string;
  actionHint: string;
  onAction: () => void;
  variant?: 'logout' | 'login';
}

export function SettingsAccountSection({
  theme,
  title,
  actionLabel,
  actionHint,
  onAction,
  variant = 'logout',
}: SettingsAccountSectionProps) {
  const isLogout = variant === 'logout';
  const danger = theme.error;

  return (
    <View style={styles.section}>
      <Text style={[styles.kicker, {color: theme.textSecondary}]}>{title}</Text>
      <TouchableOpacity
        style={[
          styles.row,
          {
            backgroundColor: isLogout
              ? `${danger}14`
              : theme.card,
          },
        ]}
        onPress={onAction}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}. ${actionHint}`}>
        <View style={styles.left}>
          <Icon
            name={isLogout ? 'log-out-outline' : 'log-in-outline'}
            size={22}
            color={isLogout ? danger : theme.primary}
          />
          <View style={styles.text}>
            <Text
              style={[
                styles.title,
                {color: isLogout ? danger : theme.text},
              ]}>
              {actionLabel}
            </Text>
            <Text
              style={[
                styles.hint,
                {color: isLogout ? danger : theme.textSecondary},
              ]}>
              {actionHint}
            </Text>
          </View>
        </View>
        <Icon
          name="chevron-forward"
          size={20}
          color={isLogout ? danger : theme.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {marginBottom: 8},
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    ...commonStyles.shadowSmall,
  },
  left: {flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0},
  text: {marginLeft: 12, flex: 1},
  title: {fontSize: 15, fontWeight: '600'},
  hint: {fontSize: 12, marginTop: 2},
});
