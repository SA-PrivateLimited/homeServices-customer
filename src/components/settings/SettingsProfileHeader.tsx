import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {MobilePhotoPicker} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';

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
  /** When set, show web-parity photo upload controls */
  canUploadPhoto?: boolean;
  uploadingPhoto?: boolean;
  cameraLabel?: string;
  galleryLabel?: string;
  photoHint?: string;
  photoError?: string | null;
  onPickCamera?: () => Promise<string[] | string | null | undefined>;
  onPickGallery?: () => Promise<string[] | string | null | undefined>;
  onPhotoPicked?: (uris: string[]) => void;
}

/**
 * Web ProfileHeader / ProfilePhotoEditor (mobile): centered column —
 * avatar → identity → stacked Take photo / Choose gallery → hint.
 */
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
  canUploadPhoto = false,
  uploadingPhoto = false,
  cameraLabel = 'Take photo',
  galleryLabel = 'Choose from gallery',
  photoHint,
  photoError,
  onPickCamera,
  onPickGallery,
  onPhotoPicked,
}: SettingsProfileHeaderProps) {
  const hasValidImage =
    !!imageUrl &&
    !imageError &&
    (imageUrl.startsWith('http') ||
      imageUrl.startsWith('file://') ||
      imageUrl.startsWith('content://'));

  const avatar = (
    <View style={styles.avatarWrap}>
      {isGuest ? (
        <View
          style={[
            styles.image,
            styles.placeholder,
            {backgroundColor: theme.primary},
          ]}>
          <Icon name="person" size={44} color="#fff" />
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
      {!isGuest && canUploadPhoto ? (
        <TouchableOpacity
          style={[
            styles.cameraBadge,
            {
              backgroundColor: theme.success,
              borderColor: theme.card,
            },
          ]}
          onPress={() => void onPickGallery?.()}
          disabled={uploadingPhoto || !onPickGallery}
          accessibilityRole="button"
          accessibilityLabel={galleryLabel}
          hitSlop={8}>
          {uploadingPhoto ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcon name="photo-camera" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const identity = (
    <View style={styles.identity}>
      <Text style={[styles.name, {color: theme.text}]}>
        {isGuest ? guestLabel : name}
      </Text>
      <View style={styles.meta}>
        <Text style={[styles.phone, {color: theme.textSecondary}]}>
          {isGuest ? guestSubtitle : phone}
        </Text>
        {!isGuest ? (
          <View style={styles.verifiedRow}>
            <Icon name="checkmark-circle" size={14} color={theme.success} />
            <Text style={[styles.verifiedText, {color: theme.success}]}>
              {verifiedLabel}
            </Text>
          </View>
        ) : null}
      </View>
      {lead && !isGuest ? (
        <Text style={[styles.lead, {color: theme.textSecondary}]}>{lead}</Text>
      ) : null}
    </View>
  );

  if (isGuest) {
    return (
      <TouchableOpacity
        style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]}
        onPress={onGuestPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${guestLabel}. ${guestSubtitle}`}>
        {avatar}
        {identity}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]}>
      {avatar}
      {identity}
      {canUploadPhoto && onPhotoPicked ? (
        <View style={styles.photoActions}>
          <MobilePhotoPicker
            layout="stack"
            disabled={uploadingPhoto}
            cameraLabel={cameraLabel}
            galleryLabel={galleryLabel}
            onPickCamera={onPickCamera}
            onPickGallery={onPickGallery}
            onChange={onPhotoPicked}
            style={styles.picker}
            colors={{
              primary: theme.primary,
              card: theme.card,
              text: theme.text,
              textSecondary: theme.textSecondary,
              border: theme.border,
              background: theme.background,
            }}
          />
          {photoHint ? (
            <Text style={[styles.photoHint, {color: theme.textSecondary}]}>
              {photoHint}
            </Text>
          ) : null}
          {photoError ? (
            <Text style={[styles.photoError, {color: theme.error}]}>
              {photoError}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
  },
  avatarWrap: {
    position: 'relative',
    width: 88,
    height: 88,
    marginBottom: 12,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {fontSize: 36, fontWeight: '700', color: '#fff'},
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  identity: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
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
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {fontSize: 12, fontWeight: '600'},
  lead: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  photoActions: {
    width: '100%',
    maxWidth: 320,
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  picker: {
    width: '100%',
    alignSelf: 'center',
  },
  photoHint: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  photoError: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
