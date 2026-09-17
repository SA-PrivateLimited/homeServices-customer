import React, {useMemo, useState} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  CUSTOMER_WEB,
} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {GlassTabBar, glassTabOverlayPad} from './GlassTabBar';

import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ShareContactRecommendationScreen from '../screens/ShareContactRecommendationScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import LegalDocumentScreen from '../screens/LegalDocumentScreen';

import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import ActiveServiceScreen from '../screens/ActiveServiceScreen';
import ProvidersListScreen from '../screens/ProvidersListScreen';
import ProviderDetailsScreen from '../screens/ProviderDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import {ProfileCompletionPrompt} from '../components/ProfileCompletionPrompt';
import {PushEnablePrompt} from '../components/PushEnablePrompt';

import {HeaderAccountActions} from '../components/account/HeaderAccountActions';
import {AccountMenuProvider} from '../components/account/AccountMenu';
import {AppHeaderLeading} from '../components/AppHeaderLeading';
import {AkansoSupportChip} from '../components/ecosystem/AkansoSupportChip';
import {HelpSupportPanel} from '../components/help/HelpSupportPanel';
import type {HelpSurface} from '../components/help/helpSurface';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function stackHeaderOptions(theme: typeof lightTheme) {
  return {
    headerShown: true,
    headerStyle: {backgroundColor: theme.card},
    headerTintColor: theme.text,
    headerTitleStyle: {fontWeight: '700' as const, fontSize: 17},
    headerShadowVisible: false,
  };
}

function headerWithChrome(
  navigation: any,
  theme: typeof lightTheme,
  title: string,
) {
  return {
    ...stackHeaderOptions(theme),
    title: '',
    headerBackVisible: false,
    headerTitleAlign: 'left' as const,
    headerLeft: () => null,
    headerTitle: () => <AppHeaderLeading title={title} />,
    headerRight: () => <HeaderAccountActions navigation={navigation} />,
    headerTitleContainerStyle: {
      left: 0,
      right: 128,
      marginHorizontal: 0,
      paddingLeft: 4,
      maxWidth: '100%',
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    headerRightContainerStyle: {
      flexShrink: 0,
      paddingRight: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
}

/** Deepest focused route name in a navigation state tree. */
function deepestRouteName(state: any): string | null {
  if (!state) return null;
  let current = state;
  while (current?.routes && typeof current.index === 'number') {
    const route = current.routes[current.index];
    if (!route) break;
    if (route.state) {
      current = route.state;
      continue;
    }
    return String(route.name || '') || null;
  }
  return null;
}

function topTabName(state: any): string | null {
  if (!state?.routes || typeof state.index !== 'number') return null;
  return String(state.routes[state.index]?.name || '') || null;
}

const ServicesStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Stack.Navigator screenOptions={stackHeaderOptions(theme)}>
      <Stack.Screen
        name="ServiceRequest"
        component={ServiceRequestScreen}
        options={({navigation}) =>
          headerWithChrome(
            navigation,
            theme,
            String(t('nav.request') || t('common.request')),
          )
        }
      />
      <Stack.Screen
        name="ServiceHistory"
        component={ServiceHistoryScreen}
        options={({navigation}) =>
          headerWithChrome(
            navigation,
            theme,
            String(t('nav.history') || t('common.history')),
          )
        }
      />
      <Stack.Screen
        name="ActiveService"
        component={ActiveServiceScreen}
        options={{
          ...stackHeaderOptions(theme),
          title: String(
            t('services.activeService') || t('active.title') || 'Active Service',
          ),
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: t('notifications.title')}}
      />
    </Stack.Navigator>
  );
};

/** Browse tab: profession list → provider details (back returns to list). */
const ProvidersStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="ProvidersList"
      screenOptions={stackHeaderOptions(theme)}>
      <Stack.Screen
        name="ProvidersList"
        component={ProvidersListScreen}
        options={({navigation}) =>
          headerWithChrome(
            navigation,
            theme,
            String(t('nav.browse') || t('common.browse')),
          )
        }
      />
      <Stack.Screen
        name="ProviderDetails"
        component={ProviderDetailsScreen}
        options={{
          ...stackHeaderOptions(theme),
          title: String(t('providers.providerDetails')),
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="ShareContactRecommendation"
        component={ShareContactRecommendationScreen}
        options={{title: t('recommendations.shareContact')}}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: t('notifications.title')}}
      />
    </Stack.Navigator>
  );
};

const SettingsStack = React.memo(() => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={stackHeaderOptions(theme)}>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={({navigation}) =>
          headerWithChrome(
            navigation,
            theme,
            String(t('nav.settings') || t('common.settings')),
          )
        }
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('profile.title'),
          headerTintColor: theme.primary,
          headerTitleStyle: {fontWeight: '700', fontSize: 17, color: theme.text},
        }}
      />
      <Stack.Screen
        name="ShareContactRecommendation"
        component={ShareContactRecommendationScreen}
        options={{title: t('recommendations.shareContact')}}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: t('notifications.title')}}
      />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={({route}: any) => ({
          title:
            route?.params?.kind === 'terms'
              ? t('settings.terms')
              : t('collab.privacy'),
        })}
      />
    </Stack.Navigator>
  );
});

const HistoryStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Stack.Navigator screenOptions={stackHeaderOptions(theme)}>
      <Stack.Screen
        name="HistoryMain"
        component={ServiceHistoryScreen}
        options={({navigation}) =>
          headerWithChrome(
            navigation,
            theme,
            String(t('history.title') || t('nav.history') || t('common.history') || 'My Requests'),
          )
        }
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: t('notifications.title')}}
      />
    </Stack.Navigator>
  );
};

/** Guest browse tab: profession list → details (back returns to list). */
const GuestBrowseStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="GuestProviders"
      screenOptions={stackHeaderOptions(theme)}>
      <Stack.Screen
        name="GuestProviders"
        component={ProvidersListScreen}
        options={({navigation}) => ({
          title: t('nav.browse') || t('common.browse'),
          headerRight: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ShareContactRecommendation')
                }
                style={{marginRight: 4, padding: 6}}>
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
                style={{
                  marginRight: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: `${theme.primary}1A`,
                }}
                accessibilityRole="button"
                accessibilityLabel={String(t('actions.signIn'))}>
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 14,
                    fontWeight: '700',
                  }}>
                  {t('actions.signIn')}
                </Text>
              </TouchableOpacity>
            </View>
          ),
        })}
      />
      <Stack.Screen
        name="ProviderDetails"
        component={ProviderDetailsScreen}
        options={{
          ...stackHeaderOptions(theme),
          title: String(t('providers.providerDetails')),
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="ShareContactRecommendation"
        component={ShareContactRecommendationScreen}
        options={{title: t('recommendations.shareContact')}}
      />
    </Stack.Navigator>
  );
};

/** Guest: Find Services only (no website-style marketing home). */
const GuestTabs = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <View style={{flex: 1}}>
      <GuestBrowseStack />
      <AkansoSupportChip
        hidden={helpOpen}
        onOpenHelp={() => {
          setFeedbackOpen(false);
          setHelpOpen(true);
        }}
      />
      <Modal
        visible={helpOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setFeedbackOpen(false);
          setHelpOpen(false);
        }}>
        <SafeAreaView
          edges={['top']}
          style={[helpStyles.root, {backgroundColor: theme.background}]}>
          {!feedbackOpen ? (
            <View
              style={[
                helpStyles.bar,
                {
                  backgroundColor: theme.card,
                  borderBottomColor: theme.border,
                },
              ]}>
              <Text style={[helpStyles.title, {color: theme.text}]}>
                {String(
                  t('help.title') || t('helpSupport.title') || 'Help & Support',
                )}
              </Text>
              <Pressable
                onPress={() => {
                  setFeedbackOpen(false);
                  setHelpOpen(false);
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={String(t('common.close') || 'Close')}>
                <Icon name="close" size={22} color={theme.text} />
              </Pressable>
            </View>
          ) : null}
          <HelpSupportPanel
            surfaceOverride="login"
            onFeedbackOpenChange={setFeedbackOpen}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

type TabNavState = {
  tab: string | null;
  leaf: string | null;
};

const MainTabs = () => {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = !currentUser?.id && !currentUser?._id;
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [navFocus, setNavFocus] = useState<TabNavState>({
    tab: 'Providers',
    leaf: 'ProvidersList',
  });

  const hideHelpChip = useMemo(() => {
    const tab = navFocus.tab;
    const leaf = navFocus.leaf;
    // Web: hidden on Settings and Request; detail screens need sticky CTAs clear
    if (tab === 'Settings') return true;
    if (tab === 'Services' && leaf === 'ServiceRequest') return true;
    if (leaf === 'ProviderDetails' || leaf === 'ActiveService') return true;
    return false;
  }, [navFocus]);

  const hideTabBar =
    navFocus.leaf === 'ProviderDetails' || navFocus.leaf === 'ActiveService';

  const helpSurface: HelpSurface = useMemo(() => {
    if (navFocus.tab === 'History') return 'history';
    if (navFocus.tab === 'Settings') return 'settings';
    if (navFocus.tab === 'Providers') return 'browse';
    if (navFocus.leaf === 'ActiveService') {
      return 'active-pending';
    }
    if (navFocus.tab === 'Services') return 'request';
    return 'default';
  }, [navFocus]);

  if (isGuest) {
    return <GuestTabs />;
  }

  return (
    <>
      <AccountMenuProvider>
        <View style={{flex: 1}}>
          <Tab.Navigator
            initialRouteName="Providers"
            tabBar={props => (hideTabBar ? null : <GlassTabBar {...props} />)}
            screenListeners={{
              state: e => {
                const state = (e as any)?.data?.state;
                setNavFocus({
                  tab: topTabName(state),
                  leaf: deepestRouteName(state),
                });
              },
            }}
            screenOptions={({route}) => ({
              headerShown: false,
              tabBarIcon: ({focused, color}) => {
                let iconName: string;

                switch (route.name) {
                  case 'Services':
                    iconName = focused ? 'build' : 'build-outline';
                    break;
                  case 'Providers':
                    iconName = focused ? 'home' : 'home-outline';
                    break;
                  case 'History':
                    iconName = focused ? 'time' : 'time-outline';
                    break;
                  case 'Settings':
                    iconName = focused ? 'settings' : 'settings-outline';
                    break;
                  default:
                    iconName = 'help-outline';
                }

                return (
                  <Icon
                    name={iconName}
                    size={CUSTOMER_WEB.tabIcon}
                    color={color}
                  />
                );
              },
              tabBarActiveTintColor: theme.primary,
              tabBarInactiveTintColor: theme.textSecondary,
              tabBarStyle: {
                position: 'absolute',
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                elevation: 0,
                height: hideTabBar ? 0 : glassTabOverlayPad(insets.bottom),
                display: hideTabBar ? 'none' : 'flex',
              },
              tabBarShowLabel: true,
            })}>
            <Tab.Screen
              name="Providers"
              component={ProvidersStack}
              options={{title: t('nav.home') || t('common.home')}}
            />
            <Tab.Screen
              name="Services"
              component={ServicesStack}
              options={{title: t('nav.request') || t('common.request')}}
              listeners={({navigation}) => ({
                tabPress: () => {
                  navigation.navigate('Services', {
                    screen: 'ServiceRequest',
                    params: {
                      requestMode: 'open',
                      provider: undefined,
                      serviceType: undefined,
                    },
                  });
                },
              })}
            />
            <Tab.Screen
              name="History"
              component={HistoryStack}
              options={{title: t('nav.history') || t('common.history')}}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsStack}
              options={{title: t('nav.settings') || t('common.settings')}}
            />
          </Tab.Navigator>

          <AkansoSupportChip
            hidden={hideHelpChip || helpOpen}
            onOpenHelp={() => {
              setFeedbackOpen(false);
              setHelpOpen(true);
            }}
          />

          <Modal
            visible={helpOpen}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => {
              setFeedbackOpen(false);
              setHelpOpen(false);
            }}>
            <SafeAreaView
              edges={['top']}
              style={[helpStyles.root, {backgroundColor: theme.background}]}>
              {!feedbackOpen ? (
                <View
                  style={[
                    helpStyles.bar,
                    {
                      backgroundColor: theme.card,
                      borderBottomColor: theme.border,
                    },
                  ]}>
                  <Text style={[helpStyles.title, {color: theme.text}]}>
                    {String(
                      t('help.title') ||
                        t('helpSupport.title') ||
                        'Help & Support',
                    )}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setFeedbackOpen(false);
                      setHelpOpen(false);
                    }}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={String(t('common.close') || 'Close')}>
                    <Icon name="close" size={22} color={theme.text} />
                  </Pressable>
                </View>
              ) : null}
              <HelpSupportPanel
                surfaceOverride={helpSurface}
                onHistory={navFocus.tab === 'History'}
                onFeedbackOpenChange={setFeedbackOpen}
              />
            </SafeAreaView>
          </Modal>

          <ProfileCompletionPrompt />
          <PushEnablePrompt />
        </View>
      </AccountMenuProvider>
    </>
  );
};

const helpStyles = StyleSheet.create({
  root: {flex: 1},
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {fontSize: 17, fontWeight: '700', flex: 1, paddingRight: 8},
});

export default MainTabs;
