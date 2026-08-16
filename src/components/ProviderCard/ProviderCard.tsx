import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';

export interface ProviderCardProps {
  name: string;
  profession: string;
  district?: string;
  experienceLabel?: string;
  rating?: number;
  reviewsLabel?: string;
  isOnline?: boolean;
  imageUrl?: string;
  onlineLabel: string;
  phone?: string | null;
  callLabel: string;
  contactLabel: string;
  requestLabel: string;
  theme: Theme;
  onOpen?: () => void;
  onCall?: () => void;
  onContact?: () => void;
  onRequest: () => void;
}

export default function ProviderCard({
  name,
  profession,
  district,
  experienceLabel,
  rating,
  reviewsLabel,
  isOnline,
  imageUrl,
  onlineLabel,
  phone,
  callLabel,
  contactLabel,
  requestLabel,
  theme,
  onOpen,
  onCall,
  onContact,
  onRequest,
}: ProviderCardProps) {
  const {width} = useWindowDimensions();
  const stack = width < 400;
  const hasPhone = Boolean(phone);

  const buttonColors = {
    primary: theme.primary,
    background: theme.background,
    card: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
  };

  return (
    <View
      style={[
        styles.card,
        stack && styles.cardStacked,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}>
      <Pressable
        style={styles.main}
        onPress={onOpen}
        disabled={!onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={name}>
        <View style={styles.avatarWrap}>
          {imageUrl ? (
            <Image source={{uri: imageUrl}} style={styles.avatar} />
          ) : (
            <View style={[styles.placeholder, {backgroundColor: theme.border}]}>
              <Icon name="person" size={36} color={theme.textSecondary} />
            </View>
          )}
          {isOnline ? <View style={styles.onlineDot} /> : null}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, {color: theme.text}]}>{name}</Text>
            {isOnline ? (
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineBadgeText}>{onlineLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.profession, {color: theme.textSecondary}]}>
            {profession}
          </Text>
          {district ? (
            <View style={styles.metaRow}>
              <Icon name="place" size={14} color={theme.primary} />
              <Text style={[styles.metaText, {color: theme.textSecondary}]}>
                {district}
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
                <Text style={[styles.metaText, {color: theme.textSecondary}]}>
                  {reviewsLabel}
                </Text>
              ) : null}
            </View>
          ) : null}
          {experienceLabel ? (
            <Text style={[styles.experience, {color: theme.textSecondary}]}>
              {experienceLabel}
            </Text>
          ) : null}
          {hasPhone ? (
            <View style={styles.metaRow}>
              <Icon name="phone" size={14} color={theme.primary} />
              <Text style={[styles.phoneText, {color: theme.text}]}>{phone}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={[styles.actions, stack && styles.actionsStacked]}>
        {hasPhone ? (
          <Button
            title={callLabel}
            variant="secondary"
            size="sm"
            block
            colors={buttonColors}
            onPress={onCall}
          />
        ) : (
          <Button
            title={contactLabel}
            variant="secondary"
            size="sm"
            block
            colors={buttonColors}
            onPress={onContact}
          />
        )}
        <Button
          title={requestLabel}
          variant="primary"
          size="sm"
          block
          colors={buttonColors}
          onPress={onRequest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardStacked: {
    flexDirection: 'column',
  },
  main: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  placeholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: '#FFF',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  onlineBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  onlineBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  profession: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  experience: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  phoneText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  actions: {
    width: 120,
    gap: 8,
    justifyContent: 'center',
  },
  actionsStacked: {
    width: '100%',
  },
});
