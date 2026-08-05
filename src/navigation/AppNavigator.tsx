import React, {useState, useEffect} from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {getStoredJwt, normalizeUser, readStoredUser} from '../services/session';
import {onSessionExpired} from '../services/sessionExpiry';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import PhoneVerificationScreen from '../screens/PhoneVerificationScreen';
import MainTabs from './MainTabs';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import ActiveServiceScreen from '../screens/ActiveServiceScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
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
        initialRouteName="Main"
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen
          name="PhoneVerification"
          component={PhoneVerificationScreen}
          options={{headerShown: false}}
        />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
