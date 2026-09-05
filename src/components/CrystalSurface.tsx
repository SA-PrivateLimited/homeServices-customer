import React, {type ReactNode} from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

export type CrystalTone = 'default' | 'accent' | 'status';

type CrystalOpts = {
  primary: string;
  card: string;
  isDark?: boolean;
  /** Stronger primary wash — web `.home-avail.is-online` */
  accent?: boolean;
  /** Job/history status tint (success / error / warning / primary) */
  statusColor?: string;
  /** `job` = JobsPage accepted/in-progress saturation */
  intensity?: 'default' | 'job';
};

/**
 * Approximate Customer Web crystal-glass `color-mix` fills for RN
 * (no CSS color-mix / backdrop-filter).
 *
 * Service request cards (ServiceRequestCard.css / HistoryPage.css):
 *  - pending: warning wash
 *  - accepted / completed: success wash
 *  - in-progress: primary wash
 *  - cancelled: error wash
 */
export function crystalWashColor({
  primary,
  isDark,
  accent,
  statusColor,
  intensity = 'default',
}: CrystalOpts): string {
  const wash = statusColor || primary;
  if (intensity === 'job') {
    // Match JobsPage job-card--accepted / --in-progress saturation
    return isDark ? `${wash}4D` : `${wash}47`; // ~28–30%
  }
  if (accent) {
    return isDark ? `${wash}33` : `${wash}1A`;
  }
  if (statusColor) {
    return isDark ? `${wash}2E` : `${wash}24`;
  }
  return isDark ? `${wash}1F` : `${wash}12`;
}

export function crystalSurfaceStyle(opts: CrystalOpts): ViewStyle {
  const isDark = Boolean(opts.isDark);
  const wash = opts.statusColor || opts.primary;
  return {
    borderRadius: 18,
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: opts.card,
    shadowColor:
      opts.intensity === 'job' && wash
        ? wash
        : isDark
          ? '#000000'
          : '#1E3C5A',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity:
      opts.intensity === 'job' ? (isDark ? 0.35 : 0.18) : isDark ? 0.28 : 0.06,
    shadowRadius: 12,
    elevation: opts.intensity === 'job' ? 4 : 3,
  };
}

type CrystalSurfaceProps = ViewProps &
  CrystalOpts & {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    radius?: number;
  };

/**
 * Opaque crystal card — matches web `.hs-card` / `.home-avail` glass recipe:
 * card base + primary color-mix wash + top inset highlight + soft shadow.
 */
export function CrystalSurface({
  children,
  style,
  contentStyle,
  primary,
  card,
  isDark,
  accent,
  statusColor,
  intensity = 'default',
  radius = 18,
  ...rest
}: CrystalSurfaceProps) {
  const wash = crystalWashColor({
    primary,
    card,
    isDark,
    accent,
    statusColor,
    intensity,
  });
  const highlight = isDark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.85)';
  const sheen = isDark
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.45)';

  return (
    <View
      {...rest}
      style={[
        crystalSurfaceStyle({
          primary,
          card,
          isDark,
          accent,
          statusColor,
          intensity,
        }),
        {borderRadius: radius},
        style,
      ]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, {backgroundColor: wash}]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {backgroundColor: sheen, opacity: intensity === 'job' ? 0.65 : 0.55},
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.highlight, {backgroundColor: highlight}]}
      />
      <View style={[styles.body, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  body: {
    position: 'relative',
    zIndex: 1,
  },
});
