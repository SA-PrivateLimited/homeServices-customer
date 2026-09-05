/**
 * Presentational service-request card — parity with customer-web ServiceRequestCard.
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Avatar} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';
import {toSafeMaterialIcon} from '../../utils/serviceIcons';
import useTranslation from '../../hooks/useTranslation';
import {CrystalSurface} from '../CrystalSurface';

export type ServiceRequestCardChip = {
  label: string;
  color: string;
};

export type ServiceRequestCardFact = {
  icon: string;
  /** Web meta rows use value only; label is optional / unused when empty */
  label?: string;
  value: string;
};

/** Web `.srcard-glass--*` status keys */
export type ServiceRequestCardStatus =
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

type Props = {
  theme: Theme;
  title: string;
  subtitle?: string;
  serviceType?: string;
  /** Drives crystal wash (customer-web srcard-glass) */
  statusKey?: ServiceRequestCardStatus | string;
  /** chips[0] = corner status badge (web). Extra chips ignored for parity. */
  chips?: ServiceRequestCardChip[];
  facts?: ServiceRequestCardFact[];
  description?: string;
  cancelReason?: string;
  /** Digits used for tel: only — never shown next to Call (web callOnly). */
  phone?: string | null;
  callLabel?: string;
  online?: boolean | null;
  onlineLabel?: string;
  offlineLabel?: string;
  avatarSrc?: string | null;
  avatarName?: string | null;
  viewDetailsLabel: string;
  onPress: () => void;
  onCall?: () => void;
  leadingAction?: React.ReactNode;
  children?: React.ReactNode;
};

export type ServiceRequestCardProps = Props;

function statusTint(statusKey: string | undefined, theme: Theme): string {
  switch (String(statusKey || '').toLowerCase()) {
    case 'accepted':
    case 'completed':
      return theme.success;
    case 'in-progress':
    case 'in_progress':
      return theme.primary;
    case 'cancelled':
    case 'canceled':
    case 'rejected':
      return theme.error;
    case 'pending':
    default:
      return theme.warning;
  }
}

export function ServiceRequestCard({
  theme,
  title,
  subtitle,
  serviceType,
  statusKey = 'pending',
  chips = [],
  facts = [],
  description,
  cancelReason,
  phone,
  callLabel,
  online,
  onlineLabel,
  offlineLabel,
  avatarSrc,
  avatarName,
  viewDetailsLabel,
  onPress,
  onCall,
  leadingAction,
  children,
}: Props) {
  const {t} = useTranslation();
  const resolvedCallLabel =
    callLabel ?? String(t('contact.callProvider') || t('providers.callProvider') || 'Call');
  const resolvedOnlineLabel = onlineLabel ?? String(t('providers.online'));
  const resolvedOfflineLabel = offlineLabel ?? String(t('providers.offline'));
  const iconName = toSafeMaterialIcon(undefined, serviceType || title);
  const tint = statusTint(statusKey, theme);
  const isDark = theme.background === '#0B1220';
  const statusChip = chips[0];
  const showCall = Boolean(phone && onCall);
  // Web `.srcard-call`: status tint ~8% mixed into translucent white.
  const callBg = isDark ? `${tint}28` : `${tint}14`;

  return (
    <CrystalSurface
      primary={theme.primary}
      card={theme.card}
      isDark={isDark}
      statusColor={tint}
      radius={18}
      style={styles.card}
      contentStyle={[
        styles.cardInner,
        statusChip ? styles.cardInnerWithBadge : null,
      ]}>
      <Pressable onPress={onPress} accessibilityRole="button">
        <View style={styles.head}>
          {avatarName ? (
            <Avatar
              src={avatarSrc}
              name={avatarName}
              size={36}
              colors={{primary: theme.primary}}
            />
          ) : (
            <View style={[styles.iconWrap, {backgroundColor: `${tint}24`}]}>
              <Icon name={iconName} size={22} color={tint} />
            </View>
          )}
          <View style={styles.copy}>
            <Text style={[styles.title, {color: theme.text}]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <View style={styles.subtitleRow}>
                <Text
                  style={[styles.subtitle, {color: theme.textSecondary}]}
                  numberOfLines={2}>
                  {subtitle}
                </Text>
                {online === true ? (
                  <Text style={[styles.presence, {color: theme.success}]}>
                    {' · '}
                    {resolvedOnlineLabel}
                  </Text>
                ) : online === false ? (
                  <Text style={[styles.presence, {color: theme.textSecondary}]}>
                    {' · '}
                    {resolvedOfflineLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {description ? (
          <Text style={[styles.problem, {color: theme.text}]} numberOfLines={3}>
            {description}
          </Text>
        ) : null}

        {cancelReason ? (
          <Text style={[styles.cancelReason, {color: theme.error}]} numberOfLines={3}>
            {cancelReason}
          </Text>
        ) : null}

        {facts.map(fact => (
          <View key={`${fact.icon}-${fact.value}`} style={styles.metaRow}>
            <Icon
              name={toSafeMaterialIcon(fact.icon, undefined)}
              size={14}
              color={theme.textSecondary}
              style={styles.metaIcon}
            />
            <Text
              style={[styles.metaText, {color: theme.text}]}
              numberOfLines={2}>
              {fact.value}
            </Text>
          </View>
        ))}
      </Pressable>

      {/* Web: Call only — never show raw digits beside Call */}
      {showCall ? (
        <View style={styles.callSlot}>
          <Pressable
            onPress={onCall}
            style={[
              styles.callBtn,
              {
                backgroundColor: callBg,
                // Soft status tint wash (web srcard-call 8% mix)
                borderColor: `${tint}22`,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={resolvedCallLabel}>
            <Icon name="call" size={14} color={theme.text} />
            <Text style={[styles.callBtnText, {color: theme.text}]}>
              {resolvedCallLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {children}

      <View style={styles.footer}>
        {leadingAction}
        <Pressable
          onPress={onPress}
          style={styles.viewRow}
          accessibilityRole="button">
          <Text style={[styles.viewText, {color: theme.primary}]}>
            {viewDetailsLabel}
          </Text>
          <Icon name="chevron-right" size={16} color={theme.primary} />
        </Pressable>
      </View>

      {/* Corner badge last so it paints above card content (web srcard-status-badge) */}
      {statusChip ? (
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: `${statusChip.color}24`},
          ]}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Text
            style={[styles.statusBadgeText, {color: statusChip.color}]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {String(statusChip.label || '')}
          </Text>
        </View>
      ) : null}
    </CrystalSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    overflow: 'hidden',
  },
  cardInner: {
    padding: 12,
    position: 'relative',
  },
  cardInnerWithBadge: {
    paddingRight: 12,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
    // RN: % maxWidth on absolute children often collapses → "A…" / "…"
    maxWidth: 168,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
    lineHeight: 15,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
    paddingRight: 88,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1, minWidth: 0},
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  subtitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 2,
  },
  subtitle: {fontSize: 12, lineHeight: 16, flexShrink: 1},
  presence: {fontSize: 11, fontWeight: '600'},
  problem: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  cancelReason: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  metaIcon: {
    marginTop: 1,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  callSlot: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  callBtn: {
    alignSelf: 'flex-start',
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
  },
  viewRow: {flexDirection: 'row', alignItems: 'center', marginLeft: 'auto'},
  viewText: {fontSize: 13, fontWeight: '600'},
});
