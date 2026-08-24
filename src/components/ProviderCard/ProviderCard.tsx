import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Avatar, Button} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';
import {commonStyles} from '../../utils/theme';
import useTranslation from '../../hooks/useTranslation';

export type ProviderCardProps = {
  theme: Theme;
  name: string;
  profession: string;
  location?: string;
  experienceLabel?: string;
  rating?: number;
  reviewsLabel?: string;
  image?: string | null;
  isOnline?: boolean;
  onlineLabel?: string;
  phone?: string | null;
  callLabel: string;
  requestLabel: string;
  contactLabel?: string;
  hidePhoto?: boolean;
  onPress?: () => void;
  onCall?: () => void;
  onRequest: () => void;
  onContact?: () => void;
};

export function ProviderCard({
  theme,
  name,
  profession,
  location,
  experienceLabel,
  rating,
  reviewsLabel,
  image,
  isOnline,
  onlineLabel,
  phone,
  callLabel,
  requestLabel,
  contactLabel,
  hidePhoto = false,
  onPress,
  onCall,
  onRequest,
  onContact,
}: ProviderCardProps) {
  const {t} = useTranslation();
  const showPhone = Boolean(phone);
  const resolvedOnline = onlineLabel ?? String(t('providers.online'));
  const resolvedContact =
    contactLabel ?? String(t('providers.contactProvider'));
  const resolvedCall = callLabel || String(t('providers.callProvider'));
  const resolvedRequest =
    requestLabel || String(t('providers.requestService'));

  return (
    <View style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]}>
      <Pressable
        style={styles.main}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}>
        {hidePhoto ? null : (
          <View style={styles.avatarWrap}>
            <Avatar
              src={image}
              name={name}
              size={64}
              colors={{primary: theme.primary}}
            />
            {isOnline ? (
              <View style={[styles.onlineDot, {borderColor: theme.card}]} />
            ) : null}
          </View>
        )}
        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, {color: theme.text}]} numberOfLines={1}>
              {name}
            </Text>
            {isOnline ? (
              <View style={[styles.onlineBadge, {backgroundColor: theme.success}]}>
                <Text style={styles.onlineBadgeText}>{resolvedOnline}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <Icon name="work" size={14} color={theme.success} />
            <Text style={[styles.meta, {color: theme.textSecondary}]} numberOfLines={1}>
              {profession}
            </Text>
          </View>
          {location ? (
            <View style={styles.metaRow}>
              <Icon name="place" size={14} color={theme.success} />
              <Text style={[styles.meta, {color: theme.textSecondary}]} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
          {experienceLabel ? (
            <View style={styles.metaRow}>
              <Icon name="verified-user" size={14} color={theme.success} />
              <Text style={[styles.meta, {color: theme.textSecondary}]} numberOfLines={1}>
                {experienceLabel}
              </Text>
            </View>
          ) : null}
          {typeof rating === 'number' && rating > 0 ? (
            <View style={styles.metaRow}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={[styles.ratingValue, {color: theme.text}]}>
                {rating.toFixed(1)}
              </Text>
              {reviewsLabel ? (
                <Text style={[styles.meta, {color: theme.textSecondary}]}>
                  ({reviewsLabel})
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={[styles.actions, {borderTopColor: theme.border}]}>
        {showPhone ? (
          <View style={styles.phoneRow}>
            <Icon name="phone" size={16} color={theme.textSecondary} />
            <Text style={[styles.phone, {color: theme.text}]} numberOfLines={1}>
              {phone}
            </Text>
          </View>
        ) : null}
        {showPhone && onCall ? (
          <Button
            title={resolvedCall}
            variant="secondary"
            block
            onPress={onCall}
            colors={{
              primary: theme.primary,
              card: theme.card,
              text: theme.primary,
              border: theme.primary,
            }}
            textStyle={{color: theme.primary}}
          />
        ) : onContact ? (
          <Button
            title={resolvedContact}
            variant="secondary"
            block
            onPress={onContact}
            colors={{
              primary: theme.primary,
              card: theme.card,
              text: theme.primary,
              border: theme.primary,
            }}
            textStyle={{color: theme.primary}}
          />
        ) : null}
        <Button
          title={resolvedRequest}
          variant="primary"
          block
          onPress={onRequest}
          colors={{
            primary: theme.primary,
            card: theme.card,
            text: '#fff',
            border: theme.primary,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...commonStyles.shadowSmall,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
  },
  copy: {flex: 1, minWidth: 0},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  name: {flex: 1, fontSize: 17, fontWeight: '700'},
  onlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineBadgeText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  meta: {flex: 1, fontSize: 13},
  ratingValue: {fontSize: 13, fontWeight: '700'},
  actions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  phone: {fontSize: 14, fontWeight: '600'},
});
