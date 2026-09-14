import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {AppHeaderLeading} from './AppHeaderLeading';
import {HeaderAccountActions} from './account/HeaderAccountActions';
import {BrowseLocationChip} from './BrowseLocationSection/BrowseLocationChip';
import type {Theme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';

type Props = {
  navigation: any;
  theme: Theme;
  title: string;
  locationLabel: string;
  locating: boolean;
  onLocationPress: () => void;
  guest?: boolean;
};

/**
 * Compact two-row browse header: brand/actions + location chip.
 */
export function ProvidersBrowseHeader({
  navigation,
  theme,
  title,
  locationLabel,
  locating,
  onLocationPress,
  guest = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.card,
          paddingTop: insets.top,
          borderBottomColor: theme.border,
          zIndex: 4,
          elevation: 4,
        },
      ]}>
      <View style={styles.topRow}>
        <View style={styles.leading}>
          <AppHeaderLeading title={title} />
        </View>
        {guest ? (
          <View style={styles.guestActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ShareContactRecommendation')}
              style={styles.iconBtn}
              accessibilityRole="button">
              <Icon name="person-add-outline" size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const root =
                  navigation.getParent()?.getParent() ??
                  navigation.getParent();
                if (root) root.navigate('Login');
                else navigation.navigate('Login');
              }}
              style={[
                styles.signInBtn,
                {backgroundColor: `${theme.primary}1A`},
              ]}
              accessibilityRole="button"
              accessibilityLabel={String(t('actions.signIn'))}>
              <Text style={[styles.signInText, {color: theme.primary}]}>
                {t('actions.signIn')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <HeaderAccountActions navigation={navigation} />
        )}
      </View>
      <BrowseLocationChip
        theme={theme}
        label={locationLabel}
        locating={locating}
        onPress={onLocationPress}
        variant="header"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingRight: 4,
  },
  leading: {
    flex: 1,
    minWidth: 0,
  },
  guestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconBtn: {padding: 6, marginRight: 2},
  signInBtn: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  signInText: {fontSize: 14, fontWeight: '700'},
});
