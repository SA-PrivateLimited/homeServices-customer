import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type {Theme} from '../../utils/theme';
import {commonStyles} from '../../utils/theme';

export interface SettingsProfileHeaderProps {
  theme: Theme;
  isGuest: boolean;
  name: string;
  phone: string;
  lead?: string;
  verifiedLabel: string;
  guestLabel: string;
  guestSubtitle: string;
  imageUrl?: string;
  imageError: boolean;
  initials: string;
  onImageError: () => void;
  onGuestPress: () => void;
}

export function SettingsProfileHeader({
  theme,
  isGuest,
  name,
  phone,
  lead,
  verifiedLabel,
  guestLabel,
  guestSubtitle,
  imageUrl,
  imageError,
  initials,
  onImageError,
  onGuestPress,
}: SettingsProfileHeaderProps) {
  const hasValidImage =
    !!imageUrl &&
    !imageError &&
    (imageUrl.startsWith('http') ||
      imageUrl.startsWith('file://') ||
      imageUrl.startsWith('content://'));

  const inner = (
    <>
      {isGuest ? (
        <View
          style={[
            styles.image,
            styles.placeholder,
            {backgroundColor: theme.primary},
          ]}>
          <Icon name="person" size={50} color="#fff" />
        </View>
      ) : hasValidImage ? (
        <Image
          source={{uri: imageUrl}}
          style={styles.image}
          onError={onImageError}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.image,
            styles.placeholder,
            {backgroundColor: theme.primary},
          ]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
      <Text style={[styles.name, {color: theme.text}]}>
        {isGuest ? guestLabel : name}
      </Text>
      <View style={styles.meta}>
        <Text style={[styles.phone, {color: theme.textSecondary}]}>
          {isGuest ? guestSubtitle : phone}
        </Text>
        {!isGuest ? (
          <View style={[styles.badge, {backgroundColor: theme.success}]}>
            <Icon name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.badgeText}>{verifiedLabel}</Text>
          </View>
        ) : null}
      </View>
      {lead && !isGuest ? (
        <Text style={[styles.lead, {color: theme.textSecondary}]}>{lead}</Text>
      ) : null}
    </>
  );

  if (isGuest) {
    return (
      <TouchableOpacity
        style={[styles.card, {backgroundColor: theme.card}]}
        onPress={onGuestPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${guestLabel}. ${guestSubtitle}`}>
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, {backgroundColor: theme.card}]}>{inner}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 16,
    ...commonStyles.shadowSmall,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {fontSize: 36, fontWeight: '700', color: '#fff'},
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  phone: {fontSize: 14},
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  lead: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
