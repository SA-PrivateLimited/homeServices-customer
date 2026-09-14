/**
 * Ad Slot — only renders real AdMob when a production unit ID is provided.
 * Test AdMob IDs must never ship in release (Play policy).
 */
import React, {useState} from 'react';
import {View, StyleSheet, Platform} from 'react-native';

let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
} catch (_) {
  // AdMob not linked
}

const BANNER_TEST_ID =
  Platform.OS === 'android'
    ? 'ca-app-pub-3940256099942544/6300978111'
    : 'ca-app-pub-3940256099942544/2934735716';

function isGoogleSampleAdId(id?: string): boolean {
  return Boolean(id && id.includes('ca-app-pub-3940256099942544'));
}

type AdSlotProps = {
  /** Production AdMob banner unit ID. Required for release ads. */
  adUnitId?: string;
  size?: 'banner' | 'large';
  style?: any;
};

export default function AdSlot({adUnitId, size = 'banner', style}: AdSlotProps) {
  const [adError, setAdError] = useState(false);
  const unitId = adUnitId || (__DEV__ ? BANNER_TEST_ID : '');

  // Never reserve empty grey space when an ad is unavailable.
  // Only mount a real BannerAd (or nothing).
  if (!unitId || adError || !BannerAd) {
    return null;
  }

  // Block Google sample IDs in release builds (Play policy).
  if (!__DEV__ && isGoogleSampleAdId(unitId)) {
    return null;
  }

  const adSize =
    size === 'large' ? BannerAdSize.LARGE_BANNER : BannerAdSize.BANNER;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={unitId}
        size={adSize}
        requestOptions={{requestNonPersonalizedAdsOnly: false}}
        onAdFailedToLoad={() => setAdError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
