import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Avatar, Button} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';
import {commonStyles} from '../../utils/theme';
import {serviceCategoryIcon} from '../../utils/serviceIcons';
import useTranslation from '../../hooks/useTranslation';

export type ServiceRequestCardChip = {
  label: string;
  color: string;
};

export type ServiceRequestCardFact = {
  icon: string;
  label: string;
  value: string;
};

type Props = {
  theme: Theme;
  title: string;
  subtitle?: string;
  serviceType?: string;
  chips?: ServiceRequestCardChip[];
  facts?: ServiceRequestCardFact[];
  phone?: string | null;
  phoneLabel?: string;
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

export function ServiceRequestCard({
  theme,
  title,
  subtitle,
  serviceType,
  chips = [],
  facts = [],
  phone,
  phoneLabel,
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
  const resolvedPhoneLabel = phoneLabel ?? String(t('profile.phone'));
  const resolvedCallLabel = callLabel ?? String(t('providers.callProvider'));
  const resolvedOnlineLabel = onlineLabel ?? String(t('providers.online'));
  const resolvedOfflineLabel = offlineLabel ?? String(t('providers.offline'));
  const iconName = serviceCategoryIcon(serviceType || title);

  return (
    <View style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]}>
      <Pressable onPress={onPress} accessibilityRole="button">
        <View style={styles.top}>
          <View style={styles.identity}>
            {avatarName ? (
              <Avatar
                src={avatarSrc}
                name={avatarName}
                size={44}
                colors={{primary: theme.primary}}
              />
            ) : (
              <View style={[styles.iconWrap, {backgroundColor: `${theme.success}22`}]}>
                <Icon name={iconName} size={22} color={theme.success} />
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
                    numberOfLines={1}>
                    {subtitle}
                  </Text>
                  {online === true ? (
                    <Text style={[styles.presence, {color: theme.success}]}>
                      {'  •  '}
                      {resolvedOnlineLabel}
                    </Text>
                  ) : online === false ? (
                    <Text style={[styles.presence, {color: theme.textSecondary}]}>
                      {'  •  '}
                      {resolvedOfflineLabel}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.chips}>
            {chips.map(chip => (
              <View
                key={chip.label}
                style={[styles.chip, {backgroundColor: `${chip.color}22`}]}>
                <Text style={[styles.chipText, {color: chip.color}]}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {facts.map(fact => (
          <View key={`${fact.label}-${fact.value}`} style={styles.fact}>
            <Icon name={fact.icon} size={16} color={theme.success} />
            <View style={styles.factText}>
              {fact.label ? (
                <Text style={[styles.factLabel, {color: theme.textSecondary}]}>
                  {fact.label}
                </Text>
              ) : null}
              <Text style={[styles.factValue, {color: theme.text}]} numberOfLines={2}>
                {fact.value}
              </Text>
            </View>
          </View>
        ))}
      </Pressable>

      {phone ? (
        <View style={styles.phoneBlock}>
          <View style={styles.fact}>
            <Icon name="phone" size={16} color={theme.success} />
            <View style={styles.factText}>
              <Text style={[styles.factLabel, {color: theme.textSecondary}]}>
                {resolvedPhoneLabel}
              </Text>
              <Text style={[styles.factValue, {color: theme.text}]}>{phone}</Text>
            </View>
          </View>
          {onCall ? (
            <Button
              title={resolvedCallLabel}
              variant="secondary"
              size="sm"
              onPress={onCall}
              colors={{
                primary: theme.primary,
                card: theme.card,
                text: theme.primary,
                border: theme.primary,
              }}
              textStyle={{color: theme.primary}}
              style={styles.callBtn}
            />
          ) : null}
        </View>
      ) : null}

      {children}

      <View style={[styles.footer, {borderTopColor: theme.border}]}>
        {leadingAction}
        <Pressable onPress={onPress} style={styles.viewRow} accessibilityRole="button">
          <Text style={[styles.viewText, {color: theme.primary}]}>{viewDetailsLabel}</Text>
          <Icon name="chevron-right" size={18} color={theme.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...commonStyles.shadowSmall,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  identity: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0},
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1, minWidth: 0},
  title: {fontSize: 17, fontWeight: '700'},
  subtitleRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4},
  subtitle: {fontSize: 13, flexShrink: 1},
  presence: {fontSize: 12, fontWeight: '600'},
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: '42%',
  },
  chip: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
  chipText: {fontSize: 11, fontWeight: '700'},
  fact: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10},
  factText: {flex: 1, minWidth: 0},
  factLabel: {fontSize: 11, fontWeight: '600', marginBottom: 2},
  factValue: {fontSize: 14, fontWeight: '600'},
  phoneBlock: {gap: 8, marginBottom: 4},
  callBtn: {alignSelf: 'stretch'},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewRow: {flexDirection: 'row', alignItems: 'center', marginLeft: 'auto'},
  viewText: {fontSize: 14, fontWeight: '600'},
});
