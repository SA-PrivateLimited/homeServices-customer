import React from 'react';
import {Image, StatusBar, StyleSheet, View} from 'react-native';

const splashArt = require('../assets/images/splash.webp') as number;

/** Matches Android `splash_sky` / `boot_splash.xml`. */
export const SPLASH_SKY = '#ABD7FE';

/** Full-screen launch poster. Stay mounted — remounting this Image is the blink. */
export function BootSplash({onPainted}: {onPainted?: () => void}) {
  return (
    <View style={styles.fill} onLayout={onPainted} collapsable={false}>
      <StatusBar barStyle="dark-content" backgroundColor={SPLASH_SKY} />
      <Image
        source={splashArt}
        defaultSource={splashArt}
        fadeDuration={0}
        style={styles.art}
        resizeMode="stretch"
        accessibilityLabel="Akansho"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: SPLASH_SKY,
  },
  art: {
    width: '100%',
    height: '100%',
  },
});
