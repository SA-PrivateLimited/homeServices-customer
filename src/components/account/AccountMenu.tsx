import React, {createContext, useContext, useMemo, useState} from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CommonActions} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../../store';
import useTranslation from '../../hooks/useTranslation';
import {
  accountMenuStyles as s,
  HEADER,
} from '../../fromWebCss/accountMenu.styles';
import {
  createPartnerContextHandoff,
  partnerHandoffUrl,
  PARTNER_WEB_URL,
} from '../../services/partnerHandoff';
import {logout} from '../../services/authService';
import LogoutConfirmationModal from '../LogoutConfirmationModal';
import {
  CUSTOMER_COLOR_THEMES,
  getBrandThemeSwatch,
  type CustomerColorThemeId,
} from '../../utils/theme';

type MenuCtx = {
  openMenu: (navigation: any) => void;
};

const AccountMenuContext = createContext<MenuCtx | null>(null);

function rootNav(navigation: any) {
  let nav = navigation;
  while (nav?.getParent?.()) {
    nav = nav.getParent();
  }
  return nav;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function useDisplayName(fallback: string) {
  const {currentUser} = useStore();
  return useMemo(() => {
    const u = currentUser as {
      name?: string;
      fullName?: string;
      displayName?: string;
    } | null;
    return (
      u?.name?.trim() ||
      u?.fullName?.trim() ||
      u?.displayName?.trim() ||
      fallback
    );
  }, [currentUser, fallback]);
}

/** Avatar in the header — panel is rendered by AccountMenuProvider (native headers cannot host Modals). */
export function AccountMenu({
  navigation,
  compact,
}: {
  navigation: any;
  compact?: boolean;
}) {
  const ctx = useContext(AccountMenuContext);
  const {t} = useTranslation();
  const name = useDisplayName(String(t('mode.customer')));

  return (
    <View collapsable={false} style={compact ? s.triggerWrapCompact : s.triggerWrap}>
      <TouchableOpacity
        style={s.trigger}
        onPress={() => ctx?.openMenu(navigation)}
        hitSlop={{top: 8, bottom: 8, left: 4, right: 8}}
        accessibilityLabel={String(t('account.menu'))}
        accessibilityRole="button">
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initialsFrom(name)}</Text>
        </View>
        {compact ? null : (
          <Icon name="expand-more" size={18} color={HEADER.text} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function AccountMenuHost({
  visible,
  navigation,
  onClose,
}: {
  visible: boolean;
  navigation: any;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const {
    currentUser,
    setCurrentUser,
    isDarkMode,
    toggleTheme,
    customerColorTheme,
    setCustomerColorTheme,
  } = useStore();
  const [busy, setBusy] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const name = useDisplayName(String(t('mode.customer')));
  const phone = useMemo(() => {
    const u = currentUser as {phoneNumber?: string; phone?: string} | null;
    return u?.phoneNumber || u?.phone || '';
  }, [currentUser]);
  const canSwitch = Boolean(
    (currentUser as {canSwitchToPartner?: boolean})?.canSwitchToPartner,
  );

  const goSettings = () => {
    onClose();
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      parent.navigate('Settings', {screen: 'SettingsMain'});
      return;
    }
    navigation?.navigate('SettingsMain');
  };

  const openPartner = () => {
    if (busy || !canSwitch) return;
    onClose();
    setBusy(true);
    void createPartnerContextHandoff()
      .then(code => Linking.openURL(partnerHandoffUrl(code)))
      .catch(() => Linking.openURL(PARTNER_WEB_URL))
      .finally(() => setBusy(false));
  };

  const selectColorTheme = (id: CustomerColorThemeId) => {
    setCustomerColorTheme(id);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={onClose}>
        <View style={{flex: 1}}>
          <Pressable style={s.backdrop} onPress={onClose} />
          <View
            pointerEvents="box-none"
            style={[s.panelWrap, {top: insets.top + 52}]}>
            <View style={s.panel}>
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                <View style={s.identity}>
                  <Text style={s.identityName}>{name}</Text>
                  {phone ? (
                    <Text style={s.identityPhone}>{phone}</Text>
                  ) : null}
                </View>

                {canSwitch ? (
                  <View style={s.modeBlock}>
                    <View style={s.modeCurrent}>
                      <Icon name="check" size={16} color={HEADER.primaryDark} />
                      <Text style={s.modeCurrentText}>
                        {t('mode.customer')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.item}
                      disabled={busy}
                      onPress={openPartner}>
                      <Icon name="swap-horiz" size={20} color={HEADER.text} />
                      <View style={{flex: 1}}>
                        <Text style={s.itemLabel}>
                          {busy
                            ? t('handoff.openingPartner')
                            : t('mode.switchToPartner')}
                        </Text>
                        <Text style={s.itemHint}>
                          {t('mode.switchToPartnerHint')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity style={s.item} onPress={goSettings}>
                  <Icon name="person" size={20} color={HEADER.text} />
                  <Text style={s.itemLabel}>{t('account.profile')}</Text>
                </TouchableOpacity>

                <View style={s.themes}>
                  <View style={s.themesLabel}>
                    <Icon name="palette" size={20} color={HEADER.text} />
                    <Text style={s.itemLabel}>
                      {t('settings.colorTheme.label') ||
                        t('settings.colorTheme') ||
                        'Theme color'}
                    </Text>
                  </View>
                  <View style={s.themesSwatches}>
                    {CUSTOMER_COLOR_THEMES.map(themeOption => {
                      const selected = customerColorTheme === themeOption.id;
                      const label =
                        t(`settings.colorTheme.${themeOption.id}`) ||
                        themeOption.id;
                      const swatch =
                        themeOption.id === 'brand'
                          ? getBrandThemeSwatch()
                          : themeOption.swatch;
                      return (
                        <TouchableOpacity
                          key={themeOption.id}
                          style={[
                            s.themeSwatch,
                            selected && {
                              borderColor: `${swatch}73`,
                              backgroundColor: `${swatch}1F`,
                            },
                          ]}
                          onPress={() => selectColorTheme(themeOption.id)}
                          accessibilityRole="button"
                          accessibilityState={{selected}}
                          accessibilityLabel={String(label)}>
                          <View
                            style={[s.themeDot, {backgroundColor: swatch}]}
                          />
                          <Text
                            style={[
                              s.themeName,
                              selected && {color: HEADER.text},
                            ]}
                            numberOfLines={1}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={s.toggle}>
                  <View style={s.toggleLabel}>
                    <Icon name="brightness-2" size={20} color={HEADER.text} />
                    <Text style={s.itemLabel}>
                      {t('settings.themeMode.dark')}
                    </Text>
                  </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={() => toggleTheme()}
                    trackColor={{false: HEADER.border, true: HEADER.primary}}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <TouchableOpacity
                  style={s.item}
                  onPress={() => {
                    onClose();
                    setShowLogout(true);
                  }}>
                  <Icon name="logout" size={20} color={HEADER.error} />
                  <Text style={[s.itemLabel, s.itemDanger]}>
                    {t('account.logout')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <LogoutConfirmationModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={async () => {
          setShowLogout(false);
          try {
            await logout();
          } catch {
            /* still clear */
          }
          await setCurrentUser(null);
          if (navigation) {
            rootNav(navigation).dispatch(
              CommonActions.reset({index: 0, routes: [{name: 'Main'}]}),
            );
          }
        }}
      />
    </>
  );
}

export function AccountMenuProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = useState(false);
  const [navigation, setNavigation] = useState<any>(null);

  const value = useMemo<MenuCtx>(
    () => ({
      openMenu: nav => {
        setNavigation(nav);
        setVisible(true);
      },
    }),
    [],
  );

  return (
    <AccountMenuContext.Provider value={value}>
      {children}
      <AccountMenuHost
        visible={visible}
        navigation={navigation}
        onClose={() => setVisible(false)}
      />
    </AccountMenuContext.Provider>
  );
}
