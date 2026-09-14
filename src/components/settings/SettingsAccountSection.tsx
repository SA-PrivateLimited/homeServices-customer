import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type {Theme} from '../../utils/theme';

export interface SettingsAccountSectionProps {
  theme: Theme;
  title: string;
  actionLabel: string;
  actionHint: string;
  onAction: () => void;
  /** logout = neutral; login = accent; danger = delete account only */
  variant?: 'logout' | 'login' | 'danger';
}

/**
 * Settings account row.
 * Logout is neutral/secondary; delete account is destructive red.
 */
export function SettingsAccountSection({
  theme,
  title,
  actionLabel,
  actionHint,
  onAction,
  variant = 'logout',
}: SettingsAccountSectionProps) {
  const isDanger = variant === 'danger';
  const isLogin = variant === 'login';
  const danger = theme.error;
  const labelColor = isDanger
    ? danger
    : isLogin
      ? theme.primary
      : theme.text;
  const hintColor = isDanger
    ? `${danger}CC`
    : theme.textSecondary;
  const iconName = isDanger
    ? 'trash-outline'
    : isLogin
      ? 'log-in-outline'
      : 'log-out-outline';
  const iconColor = isDanger
    ? danger
    : isLogin
      ? theme.primary
      : theme.textSecondary;

  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[styles.kicker, {color: theme.textSecondary}]}>
          {title}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[
          styles.row,
          {
            backgroundColor: theme.card,
            borderColor: isDanger ? `${danger}55` : theme.border,
            borderWidth: isDanger ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}
        onPress={onAction}
        activeOpacity={0.75}
        hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}. ${actionHint}`}>
        <View style={styles.left}>
          <Icon name={iconName} size={20} color={iconColor} />
          <View style={styles.text}>
            <Text style={[styles.title, {color: labelColor}]}>
              {actionLabel}
            </Text>
            {actionHint ? (
              <Text style={[styles.hint, {color: hintColor}]} numberOfLines={2}>
                {actionHint}
              </Text>
            ) : null}
          </View>
        </View>
        <Icon
          name="chevron-forward"
          size={18}
          color={isDanger ? danger : theme.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {marginBottom: 8, marginTop: 8},
  kicker: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  left: {flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0},
  text: {marginLeft: 12, flex: 1},
  title: {fontSize: 15, fontWeight: '600'},
  hint: {fontSize: 12, marginTop: 2, lineHeight: 16},
});
