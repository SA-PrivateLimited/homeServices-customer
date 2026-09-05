/**
 * Logo doodle — web `GreetingLogoAccent` parity.
 * Independent of greeting overlay; shown after login until doodleEndsAt.
 */

import React, {useEffect, useState} from 'react';
import {Animated, Easing, Image, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../../store';
import {useGreetingStore} from '../../store/greetingStore';
import {lightTheme, darkTheme} from '../../utils/theme';
import {isUsableMediaUrl} from '../../utils/mediaUrl';

const MATERIAL_ICON_NAME = /^[a-z][a-z0-9_]{0,63}$/;

function isDoodleStillOn(
  doodleEnabled: boolean,
  doodleEndsAt: string | null,
  now: number,
): boolean {
  if (!doodleEnabled || !doodleEndsAt) return false;
  const ends = Date.parse(doodleEndsAt);
  return Number.isFinite(ends) && ends > now;
}

export function GreetingLogoAccent() {
  const {currentUser, isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const config = useGreetingStore(s => s.config);
  const hydrate = useGreetingStore(s => s.hydrate);
  const signedIn = Boolean(currentUser?.id || currentUser?._id);
  const [imageFailed, setImageFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (signedIn) void hydrate();
  }, [signedIn, hydrate]);

  useEffect(() => {
    if (!signedIn || !config?.doodleEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [signedIn, config?.doodleEndsAt]);

  useEffect(() => {
    if (
      !signedIn ||
      !config ||
      !isDoodleStillOn(config.doodleEnabled, config.doodleEndsAt, now)
    ) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.14,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      {iterations: 12},
    );
    loop.start();
    return () => loop.stop();
  }, [signedIn, config, now, pulse]);

  if (
    !signedIn ||
    !config ||
    !isDoodleStillOn(config.doodleEnabled, config.doodleEndsAt, now)
  ) {
    return null;
  }

  const imageUrl =
    !imageFailed &&
    config.logoAccentUrl &&
    isUsableMediaUrl(config.logoAccentUrl)
      ? config.logoAccentUrl
      : '';

  if (imageUrl) {
    return (
      <Animated.View
        style={[styles.wrap, {transform: [{scale: pulse}]}]}
        pointerEvents="none">
        <Image
          source={{uri: imageUrl}}
          style={styles.img}
          onError={() => setImageFailed(true)}
        />
      </Animated.View>
    );
  }

  const icon = String(config.icon || '').trim();
  if (!MATERIAL_ICON_NAME.test(icon)) return null;

  return (
    <Animated.View
      style={[styles.wrap, {transform: [{scale: pulse}]}]}
      pointerEvents="none">
      <Icon name={icon as any} size={22} color={theme.primary} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
});
