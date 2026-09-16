import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStore} from '../store';
import {darkTheme, lightTheme} from '../utils/theme';
import {mixColor} from '../components/CrystalSurface';

const BAR_H = 60;
const PILL_H = 50;

/** Extra list padding so the last card can scroll above the floating tab bar. */
export function glassTabOverlayPad(safeBottom: number) {
  return BAR_H + 12 + Math.max(10, safeBottom);
}

function labelOf(option: BottomTabBarProps['descriptors'][string]['options']) {
  const raw = option.tabBarLabel ?? option.title;
  if (typeof raw === 'string') return raw;
  return '';
}

/**
 * Frosted floating tab bar with a sliding glass pill.
 * Drag the glass freely; on release it snaps to the nearest tab and opens that page.
 */
export function GlassTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [barW, setBarW] = useState(0);
  const count = state.routes.length;
  const tabW = count > 0 && barW > 0 ? barW / count : 0;
  const pillW = Math.max(68, tabW - 8);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillXValue = useRef(0);
  const dragOrigin = useRef(0);
  const suppressPress = useRef(false);

  const maxX = Math.max(0, barW - pillW);
  const xForIndex = (index: number) => {
    if (tabW <= 0) return 0;
    return Math.min(maxX, index * tabW + (tabW - pillW) / 2);
  };

  const snapTo = (index: number, spring = true) => {
    const x = xForIndex(index);
    if (!spring) {
      pillX.setValue(x);
      return;
    }
    Animated.spring(pillX, {
      toValue: x,
      useNativeDriver: true,
      friction: 7,
      tension: 68,
    }).start();
  };

  useEffect(() => {
    const id = pillX.addListener(({value}) => {
      pillXValue.current = value;
    });
    return () => pillX.removeListener(id);
  }, [pillX]);

  useEffect(() => {
    if (tabW <= 0) return;
    snapTo(state.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, tabW, pillW]);

  const goTo = (index: number) => {
    const route = state.routes[index];
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(route.name);
    }
    snapTo(index);
  };

  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          suppressPress.current = true;
          pillX.stopAnimation();
          dragOrigin.current = pillXValue.current;
        },
        onPanResponderMove: (_, g) => {
          const next = Math.max(0, Math.min(maxX, dragOrigin.current + g.dx));
          pillX.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const released = Math.max(
            0,
            Math.min(maxX, dragOrigin.current + g.dx),
          );
          const center = released + pillW / 2;
          const index = Math.max(
            0,
            Math.min(count - 1, Math.floor(center / Math.max(tabW, 1))),
          );
          goToRef.current(index);
          setTimeout(() => {
            suppressPress.current = false;
          }, 120);
        },
        onPanResponderTerminate: () => {
          const center = pillXValue.current + pillW / 2;
          const index = Math.max(
            0,
            Math.min(count - 1, Math.floor(center / Math.max(tabW, 1))),
          );
          goToRef.current(index);
          setTimeout(() => {
            suppressPress.current = false;
          }, 120);
        },
      }),
    [maxX, pillW, tabW, count, pillX],
  );

  const barBg = isDarkMode
    ? mixColor(theme.primary, theme.card, 0.08)
    : mixColor(theme.primary, theme.card, 0.04);
  const pillFill = isDarkMode
    ? mixColor('#FFFFFF', theme.card, 0.18)
    : mixColor('#FFFFFF', mixColor(theme.primary, theme.card, 0.12), 0.72);

  return (
    <View
      style={[
        styles.wrap,
        {paddingBottom: Math.max(10, insets.bottom)},
      ]}
      pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          {
            backgroundColor: barBg,
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.7)',
          },
        ]}
        onLayout={e => setBarW(e.nativeEvent.layout.width)}
        {...pan.panHandlers}>
        {barW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                width: pillW,
                backgroundColor: pillFill,
                borderColor: isDarkMode
                  ? 'rgba(255,255,255,0.28)'
                  : 'rgba(255,255,255,0.95)',
                transform: [{translateX: pillX}],
              },
            ]}>
            <View
              style={[
                styles.pillSheen,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(255,255,255,0.7)',
                },
              ]}
            />
            <View
              style={[
                styles.pillHighlight,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(255,255,255,0.95)',
                },
              ]}
            />
          </Animated.View>
        ) : null}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const color = focused ? theme.primary : theme.textSecondary;
          const icon = options.tabBarIcon?.({
            focused,
            color,
            size: 24,
          });
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? {selected: true} : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={() => {
                if (suppressPress.current) return;
                goTo(index);
              }}
              style={styles.item}>
              {icon}
              <Text style={[styles.label, {color}]} numberOfLines={1}>
                {labelOf(options) || route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  bar: {
    height: BAR_H,
    borderRadius: 30,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1E3C5A',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 12,
  },
  pill: {
    position: 'absolute',
    top: (BAR_H - PILL_H) / 2,
    left: 0,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#1E3C5A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  pillSheen: {
    position: 'absolute',
    top: -18,
    left: -12,
    width: '70%',
    height: '78%',
    borderRadius: 40,
    opacity: 0.85,
    transform: [{rotate: '-18deg'}],
  },
  pillHighlight: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
  },
});
