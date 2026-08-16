import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';

export interface ServiceRequestCardChip {
  label: string;
  color: string;
}

export interface ServiceRequestCardProps {
  title: string;
  subtitle?: string;
  chips?: ServiceRequestCardChip[];
  description?: string;
  address?: string;
  date?: string;
  phone?: string | null;
  pin?: string | null;
  pinLabel?: string;
  pinHint?: string;
  theme: Theme;
  viewDetailsLabel: string;
  reviewLabel?: string;
  callLabel?: string;
  onPress: () => void;
  onViewDetails: () => void;
  onReview?: () => void;
  onCall?: () => void;
}

export default function ServiceRequestCard({
  title,
  subtitle,
  chips = [],
  description,
  address,
  date,
  phone,
  pin,
  pinLabel,
  pinHint,
  theme,
  viewDetailsLabel,
  reviewLabel,
  callLabel,
  onPress,
  onViewDetails,
  onReview,
  onCall,
}: ServiceRequestCardProps) {
  const buttonColors = {
    primary: theme.primary,
    background: theme.background,
    card: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
  };

  return (
    <Pressable
      style={[
        styles.card,
        {backgroundColor: theme.card, shadowColor: theme.shadow},
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="build" size={24} color={theme.primary} />
          <View style={styles.copy}>
            <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {chips.length ? (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <View
                key={`${chip.label}-${chip.color}`}
                style={[styles.chip, {backgroundColor: `${chip.color}20`}]}>
                <Text style={[styles.chipText, {color: chip.color}]}>
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {description ? (
        <Text style={[styles.description, {color: theme.text}]}>
          {description}
        </Text>
      ) : null}

      {address ? (
        <View style={styles.metaRow}>
          <Icon name="location-on" size={16} color={theme.textSecondary} />
          <Text style={[styles.metaText, {color: theme.textSecondary}]}>
            {address}
          </Text>
        </View>
      ) : null}

      {date ? (
        <View style={styles.metaRow}>
          <Icon name="calendar-today" size={16} color={theme.textSecondary} />
          <Text style={[styles.metaText, {color: theme.textSecondary}]}>
            {date}
          </Text>
        </View>
      ) : null}

      {phone ? (
        <View style={styles.phoneRow}>
          <Icon name="phone" size={16} color={theme.primary} />
          <Text style={[styles.metaText, {color: theme.textSecondary}]}>
            {phone}
          </Text>
          {onCall ? (
            <Button
              title={callLabel || 'Call'}
              variant="secondary"
              size="sm"
              colors={buttonColors}
              onPress={onCall}
            />
          ) : null}
        </View>
      ) : null}

      {pin ? (
        <View
          style={[
            styles.pinBox,
            {backgroundColor: `${theme.primary}15`, borderColor: theme.primary},
          ]}>
          <Icon name="lock" size={16} color={theme.primary} />
          {pinLabel ? (
            <Text style={[styles.pinLabel, {color: theme.textSecondary}]}>
              {pinLabel}
            </Text>
          ) : null}
          <Text style={[styles.pinValue, {color: theme.primary}]}>{pin}</Text>
          {pinHint ? (
            <Text style={[styles.pinHint, {color: theme.textSecondary}]}>
              {pinHint}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        {onReview && reviewLabel ? (
          <Pressable style={styles.reviewBtn} onPress={onReview}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.reviewText}>{reviewLabel}</Text>
          </Pressable>
        ) : null}
        <Button
          title={viewDetailsLabel}
          variant="ghost"
          size="sm"
          colors={buttonColors}
          onPress={onViewDetails}
          textStyle={{color: theme.primary}}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  header: {
    marginBottom: 12,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  phoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pinBox: {
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  pinLabel: {
    fontSize: 12,
  },
  pinValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
  },
  pinHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 'auto',
  },
  reviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B7791F',
  },
});
