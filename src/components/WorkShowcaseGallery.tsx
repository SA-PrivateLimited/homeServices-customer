import React, {useMemo, useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ImageViewer} from 'sapvt-ltd-app-packages';
import {API_BASE_URL} from '../config/api';
import {isUsableMediaUrl} from '../utils/mediaUrl';
import useTranslation from '../hooks/useTranslation';
import type {Theme} from '../utils/theme';

export function normalizeShowcaseUrls(photos: unknown): string[] {
  if (!Array.isArray(photos)) return [];
  const apiBase = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return photos
    .map(item => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return String((item as {url?: string}).url || '').trim();
      }
      return '';
    })
    .map(url => {
      if (!url || /^data:|^blob:/i.test(url)) return '';
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith('/uploads/')) return `${apiBase}${url}`;
      return '';
    })
    .filter(url => Boolean(url) && isUsableMediaUrl(url))
    .slice(0, 3);
}

type Props = {
  theme: Theme;
  photos?: unknown;
};

export function WorkShowcaseGallery({theme, photos}: Props) {
  const {t} = useTranslation();
  const urls = useMemo(() => normalizeShowcaseUrls(photos), [photos]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (!urls.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, {color: theme.text}]}>
        {String(t('showcase.workShowcase'))}
      </Text>
      <View style={styles.grid}>
        {urls.map((url, index) => (
          <TouchableOpacity
            key={url}
            style={styles.thumb}
            onPress={() => setViewerIndex(index)}
            accessibilityLabel={String(
              t('showcase.viewPhoto', {n: index + 1}) || `Photo ${index + 1}`,
            )}>
            <Image source={{uri: url}} style={styles.img} />
          </TouchableOpacity>
        ))}
      </View>
      <ImageViewer
        open={viewerIndex != null}
        images={urls}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        label={String(t('showcase.workShowcase'))}
        closeLabel={String(t('actions.close') || 'Close')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(49, 130, 206, 0.06)',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  title: {fontSize: 16, fontWeight: '700', marginBottom: 12},
  grid: {flexDirection: 'row', gap: 8},
  thumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  img: {width: '100%', height: '100%'},
});
