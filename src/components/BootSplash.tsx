import React from 'react';
import {Image, StatusBar, StyleSheet, View} from 'react-native';

const splashArt = require('../assets/images/splash.webp') as number;

/** Full-screen launch poster while the customer app hydrates. */
export function BootSplash() {
  return (
    <View style={styles.fill}>
      <StatusBar barStyle="dark-content" backgroundColor="#ABD7FE" />
      <Image
        source={splashArt}
        style={styles.art}
        resizeMode="cover"
        accessibilityLabel="Akansho"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#ABD7FE',
  },
  art: {
    width: '100%',
    height: '100%',
  },
});
