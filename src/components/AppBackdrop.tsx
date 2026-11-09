import React from 'react';
import {ImageBackground, StyleSheet, View} from 'react-native';

const BACKDROP = require('../assets/fromWeb/app-backdrop.jpg');

export function AppBackdrop({
  dark,
  children,
}: {
  dark: boolean;
  children: React.ReactNode;
}) {
  if (dark) {
    return <View style={styles.fill}>{children}</View>;
  }
  return (
    <ImageBackground
      source={BACKDROP}
      style={styles.fill}
      resizeMode="cover">
      <View pointerEvents="none" style={styles.wash} />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },
});
