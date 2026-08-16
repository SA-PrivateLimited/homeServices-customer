import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadAssetFromUri, type AssetRef} from '../services/api/assetsApi';
import {getUserFacingErrorMessage} from '../utils/userFacingError';

const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type RequestPhotoItem = {
  id: string;
  uri: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
  ref?: AssetRef;
};

type ThemeColors = {
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
  card: string;
};

type Props = {
  items: RequestPhotoItem[];
  onChange: (items: RequestPhotoItem[]) => void;
  theme: ThemeColors;
  t: (key: string, options?: Record<string, unknown>) => unknown;
  disabled?: boolean;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function guessType(uri: string, type?: string): string {
  const given = (type || '').toLowerCase().replace('image/jpg', 'image/jpeg');
  if (ALLOWED_TYPES.has(given)) return given;
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export function readyPhotoRefs(
  items: RequestPhotoItem[],
): Array<{key: string; url: string}> {
  return items
    .filter(item => item.status === 'ready' && item.ref?.url)
    .map(item => ({key: item.ref?.key || '', url: item.ref?.url || ''}));
}

export function photosBusy(items: RequestPhotoItem[]): boolean {
  return items.some(item => item.status === 'uploading');
}

export function photosHaveError(items: RequestPhotoItem[]): boolean {
  return items.some(item => item.status === 'error');
}

export default function RequestPhotoPicker({
  items,
  onChange,
  theme,
  t,
  disabled,
}: Props) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [pickerError, setPickerError] = useState<string | null>(null);

  const replace = (next: RequestPhotoItem[]) => {
    itemsRef.current = next;
    onChange(next);
  };

  const patch = (id: string, update: Partial<RequestPhotoItem>) => {
    replace(
      itemsRef.current.map(item =>
        item.id === id ? {...item, ...update} : item,
      ),
    );
  };

  const uploadOne = async (id: string, uri: string, contentType: string) => {
    try {
      const ref = await uploadAssetFromUri(uri, {
        purpose: 'service-request-photo',
        contentType,
      });
      patch(id, {status: 'ready', ref, error: undefined});
    } catch (err) {
      patch(id, {
        status: 'error',
        error: getUserFacingErrorMessage(err, 'upload'),
      });
    }
  };

  const handleAdd = async () => {
    if (disabled || itemsRef.current.length >= MAX_PHOTOS) return;
    setPickerError(null);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: MAX_PHOTOS - itemsRef.current.length,
      });
      if (result.didCancel || !result.assets?.length) return;

      const queued: Array<{item: RequestPhotoItem; type: string}> = [];
      let firstError: string | null = null;
      for (const asset of result.assets) {
        if (!asset.uri) continue;
        if (itemsRef.current.length + queued.length >= MAX_PHOTOS) break;
        const type = guessType(asset.uri, asset.type);
        if (!ALLOWED_TYPES.has(type)) {
          firstError = String(
            t('services.photoTypeError') ||
              'Please choose a JPG, PNG, or WebP image.',
          );
          continue;
        }
        if (asset.fileSize && asset.fileSize > MAX_BYTES) {
          firstError = String(
            t('services.photoSizeError') ||
              'Please choose an image smaller than 5 MB.',
          );
          continue;
        }
        queued.push({
          item: {id: newId(), uri: asset.uri, status: 'uploading'},
          type,
        });
      }
      if (firstError) setPickerError(firstError);
      if (queued.length === 0) return;
      replace([...itemsRef.current, ...queued.map(entry => entry.item)]);
      queued.forEach(entry => {
        void uploadOne(entry.item.id, entry.item.uri, entry.type);
      });
    } catch {
      setPickerError(String(t('services.selectPhotoError')));
    }
  };

  return (
    <View>
      <Text style={[styles.label, {color: theme.text}]}>
        {String(t('services.addPhotosOptional'))}
      </Text>
      {items.length < MAX_PHOTOS && !disabled ? (
        <TouchableOpacity
          style={[
            styles.addButton,
            {borderColor: theme.border, backgroundColor: theme.card},
          ]}
          onPress={() => void handleAdd()}>
          <Icon name="add-photo-alternate" size={24} color={theme.primary} />
          <Text style={[styles.addText, {color: theme.primary}]}>
            {String(
              t('services.addPhoto', {count: items.length, max: MAX_PHOTOS}),
            )}
          </Text>
        </TouchableOpacity>
      ) : null}
      {pickerError ? <Text style={styles.error}>{pickerError}</Text> : null}
      {items.length > 0 ? (
        <View style={styles.row}>
          {items.map(item => (
            <View key={item.id} style={styles.thumbWrap}>
              <Image source={{uri: item.uri}} style={styles.thumb} />
              {item.status === 'uploading' ? (
                <View style={styles.overlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
              {item.status === 'error' ? (
                <TouchableOpacity
                  style={styles.overlay}
                  onPress={() => {
                    patch(item.id, {status: 'uploading', error: undefined});
                    void uploadOne(item.id, item.uri, guessType(item.uri));
                  }}>
                  <Icon name="refresh" size={22} color="#fff" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.remove}
                onPress={() =>
                  replace(itemsRef.current.filter(row => row.id !== item.id))
                }
                disabled={disabled}>
                <Icon name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      {photosHaveError(items) ? (
        <Text style={styles.error}>
          {items.find(item => item.error)?.error ||
            String(t('services.photoRetryHint') || 'Tap a photo to retry.')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {fontSize: 16, fontWeight: '600', marginBottom: 10},
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  addText: {fontSize: 14, fontWeight: '600'},
  row: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10},
  thumbWrap: {width: 84, height: 84, borderRadius: 10, overflow: 'hidden'},
  thumb: {width: '100%', height: '100%'},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {color: '#E53E3E', marginTop: 8, fontSize: 13},
});
