/**
 * Customer-app empty state — compact, MaterialIcons (reliable on Android).
 * Does not use the shared package flex:1 layout (stretches inside FlatList).
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

/** Map legacy Ionicons-style names → MaterialIcons */
const MATERIAL_ICON: Record<string, string> = {
  'person-remove-outline': 'person-off',
  'people-outline': 'people-outline',
  'document-text-outline': 'description',
  'calendar-outline': 'event',
  'notifications-outline': 'notifications-none',
  'search-outline': 'search-off',
  inbox: 'inbox',
  'inbox-outline': 'inbox',
};

type Props = {
  icon?: string;
  title: string;
  message?: string;
  /** Optional override; defaults to theme */
  iconColor?: string;
};

const EmptyState: React.FC<Props> = ({
  icon = 'search-outline',
  title,
  message = '',
  iconColor,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const materialName = MATERIAL_ICON[icon] || 'search-off';

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View
        style={[
          styles.iconWrap,
          {backgroundColor: `${theme.primary}14`},
        ]}>
        <Icon
          name={materialName as any}
          size={36}
          color={iconColor || theme.primary}
        />
      </View>
      <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, {color: theme.textSecondary}]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    maxWidth: 360,
    alignSelf: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default EmptyState;
