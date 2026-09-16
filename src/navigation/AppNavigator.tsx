import React, {useState, useEffect} from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {SPLASH_SKY} from '../components/BootSplash';
import useTranslation from '../hooks/useTranslation';
import {getStoredJwt, normalizeUser, readStoredUser} from '../services/session';
import {onSessionExpired} from '../services/sessionExpiry';
import {customerLinking} from './linking';
import {
  flushPendingNotificationNavigation,
  setNotificationNavigationRef,
} from '../services/notificationNavigation';
import NotificationService from '../services/notificationService';

import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import ActiveServiceScreen from '../screens/ActiveServiceScreen';
import AuthHandoffScreen from '../screens/AuthHandoffScreen';
import LegalDocumentScreen from '../screens/LegalDocumentScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function AppNavigator({onReady}: {onReady?: () => void}) {
  const [initializing, setInitializing] = useState(true);
  const {isDarkMode, setCurrentUser, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const isAuthed = Boolean(currentUser?.id || currentUser?._id);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const jwt = await getStoredJwt();
        const storedUser = await readStoredUser();
        if (jwt && storedUser && mounted) {
          setCurrentUser(normalizeUser(storedUser) as any);
        } else if (mounted) {
          setCurrentUser(null);
        }
      } catch (e) {
        console.warn('App boot failed:', e);
        if (mounted) setCurrentUser(null);
      } finally {
        if (mounted) setInitializing(false);
      }
    };

    void boot();
    return () => {
      mounted = false;
    };
  }, [setCurrentUser]);

  useEffect(() => {
    return onSessionExpired(() => {
      void (async () => {
        try {
          await setCurrentUser(null);
        } catch {
          // ignore
        }
        if (navigationRef.isReady()) {
          navigationRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{name: 'Login'}],
            }),
          );
        }
      })();
    });
  }, [setCurrentUser]);

  if (initializing) {
    return <View style={{flex: 1, backgroundColor: SPLASH_SKY}} />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setNotificationNavigationRef(navigationRef);
        flushPendingNotificationNavigation();
        NotificationService.bindOpenHandlers();
        onReady?.();
      }}
      linking={customerLinking}
      theme={{
        dark: isDarkMode,
        colors: {
          primary: theme.primary,
          background: theme.background,
          card: theme.card,
          text: theme.text,
          border: theme.border,
          notification: theme.primary,
        },
      }}>
      <Stack.Navigator
        initialRouteName={isAuthed ? 'Main' : 'Login'}
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AuthHandoff" component={AuthHandoffScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="ServiceRequest"
          component={ServiceRequestScreen}
          options={{
            headerShown: true,
            title: t('services.requestService'),
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="ServiceHistory"
          component={ServiceHistoryScreen}
          options={{
            headerShown: true,
            title: t('services.serviceHistory'),
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="ActiveService"
          component={ActiveServiceScreen}
          options={{
            headerShown: true,
            title: t('services.activeService'),
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="LegalDocument"
          component={LegalDocumentScreen}
          options={{headerShown: true, title: ''}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
