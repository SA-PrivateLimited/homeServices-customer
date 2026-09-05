import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';

interface LanguageSwitcherProps {
  /** Header compact: हिं | EN pills (web AppShell ≤430px). */
  compact?: boolean;
}

/** ~16% primary tint — matches web `.lang-switcher button.is-active`. */
function primaryTint(hex: string, amount = 0.16): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const a = Math.round(amount * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${raw}${a}`;
}

/**
 * Web `LanguageSwitcher` parity — crystal shell + tinted active pill.
 * Compact (phone header): short हिं / EN like web ≤430px.
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
}) => {
  const {isDarkMode, language, setLanguage} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const currentLanguage = language || 'hi';
  const isHi = String(currentLanguage).startsWith('hi');

  const setLang = async (next: 'hi' | 'en') => {
    if (next === currentLanguage) return;
    try {
      await setLanguage(next);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const activeBg = isDarkMode
    ? theme.primary
    : primaryTint(theme.primary, 0.16);
  const activeColor = isDarkMode ? '#fff' : theme.primary;

  return (
    <View
      style={[
        styles.shell,
        compact && styles.shellCompact,
        {
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.55)',
          // Web crystal inset highlight
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDarkMode
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.75)',
        },
      ]}
      accessibilityRole="adjustable"
      accessibilityLabel={String(t('account.language') || 'Language')}>
      {!compact ? (
        <Icon
          name="language"
          size={16}
          color={theme.textSecondary}
          style={styles.globe}
        />
      ) : null}
      <TouchableOpacity
        style={[
          styles.pill,
          compact && styles.pillCompact,
          isHi && {backgroundColor: activeBg},
        ]}
        onPress={() => void setLang('hi')}
        accessibilityState={{selected: isHi}}>
        <Text
          style={[
            styles.pillText,
            compact && styles.pillTextCompact,
            {color: isHi ? activeColor : theme.textSecondary},
          ]}>
          {compact ? 'हिं' : String(t('login.langHindi') || 'Hindi')}
        </Text>
      </TouchableOpacity>
      {!compact ? (
        <Text style={[styles.sep, {color: theme.textSecondary}]}>|</Text>
      ) : null}
      <TouchableOpacity
        style={[
          styles.pill,
          compact && styles.pillCompact,
          !isHi && {backgroundColor: activeBg},
        ]}
        onPress={() => void setLang('en')}
        accessibilityState={{selected: !isHi}}>
        <Text
          style={[
            styles.pillText,
            compact && styles.pillTextCompact,
            {color: !isHi ? activeColor : theme.textSecondary},
          ]}>
          {compact ? 'EN' : String(t('login.langEnglish') || 'English')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignSelf: 'center',
  },
  shellCompact: {
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  globe: {marginRight: 0},
  sep: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.55,
    paddingHorizontal: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 0,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextCompact: {
    fontSize: 12,
  },
});

export default LanguageSwitcher;
