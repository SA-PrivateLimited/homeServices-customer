/**
 * Web AppShell leading chrome: brand logo + doodle + page title.
 */

import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {GreetingLogoAccent} from './greeting/GreetingLogoAccent';

type Props = {
  title: string;
};

export function AppHeaderLeading({title}: Props) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Image
          source={require('../assets/fromWeb/logo.png')}
          style={styles.logo}
          accessibilityIgnoresInvertColors
        />
        <GreetingLogoAccent />
      </View>
      {title ? (
        <Text
          style={[styles.title, {color: theme.text}]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    paddingLeft: 4,
    paddingRight: 6,
    minHeight: 44,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    height: 36,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
    flex: 1,
    minWidth: 0,
    lineHeight: 20,
  },
});
