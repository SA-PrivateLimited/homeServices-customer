import React from 'react';
import {StyleSheet, View, type ReactNode} from 'react-native';
import NotificationIcon from '../NotificationIcon';
import {AccountMenu} from './AccountMenu';
import LanguageSwitcher from '../LanguageSwitcher';

type Props = {
  navigation: any;
  notificationsScreen?: string;
  /** Hide language toggle (rare). Default: show like web AppShell. */
  showLanguage?: boolean;
  /** Hide notification bell (e.g. guest). Default: show when logged in. */
  showNotifications?: boolean;
  /**
   * Optional control between bell and avatar (web Settings: hamburger before avatar).
   */
  beforeAccount?: ReactNode;
};

/**
 * Web AppShell actions: LanguageSwitcher + notifications + [menu] + AccountMenu.
 */
export function HeaderAccountActions({
  navigation,
  notificationsScreen = 'Notifications',
  showLanguage = true,
  showNotifications = true,
  beforeAccount,
}: Props) {
  return (
    <View style={styles.row}>
      {showLanguage ? (
        <View style={styles.slot}>
          <LanguageSwitcher compact />
        </View>
      ) : null}
      {showNotifications ? (
        <View style={styles.slot}>
          <NotificationIcon
            onPress={() => navigation.navigate(notificationsScreen)}
          />
        </View>
      ) : null}
      {beforeAccount ? <View style={styles.slot}>{beforeAccount}</View> : null}
      <View style={styles.slot}>
        <AccountMenu navigation={navigation} compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingRight: 2,
    minHeight: 44,
  },
  /** Shared 40×40 hit target so header icons share one vertical midline. */
  slot: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
