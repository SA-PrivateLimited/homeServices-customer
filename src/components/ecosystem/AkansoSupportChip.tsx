/**
 * Compact Help chip above the tab bar — web `AkansoSupportChip` parity.
 */

import React from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStore} from '../../store';
import {lightTheme, darkTheme} from '../../utils/theme';
import useTranslation from '../../hooks/useTranslation';
import {glassTabOverlayPad} from '../../navigation/GlassTabBar';

type Props = {
  onOpenHelp: () => void;
  hidden?: boolean;
  /** Guest home has no tab bar — float above the safe area only. */
  floatAboveTabs?: boolean;
};

export function AkansoSupportChip({
  onOpenHelp,
  hidden,
  floatAboveTabs = true,
}: Props) {
  const {t} = useTranslation();
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  if (hidden) return null;

  const bottom =
    (floatAboveTabs ? glassTabOverlayPad(insets.bottom) : Math.max(insets.bottom, 0)) +
    (floatAboveTabs ? 4 : 16);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.anchor, {bottom}]}>
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: `${theme.primary}1F`,
            shadowColor: theme.primary,
          },
        ]}
        onPress={onOpenHelp}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={String(
          t('ecosystem.supportChipAria') || 'Open Help & Support',
        )}>
        <Image
          source={require('../../assets/fromWeb/helpAndSupport.png')}
          style={styles.art}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 12,
    zIndex: 45,
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
  },
  art: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
});
