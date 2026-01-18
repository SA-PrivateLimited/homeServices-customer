import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';

// Screens - Settings (kept for profile management)
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Screens - Services
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import ActiveServiceScreen from '../screens/ActiveServiceScreen';
import ProvidersListScreen from '../screens/ProvidersListScreen';
import ProviderDetailsScreen from '../screens/ProviderDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// Components
import NotificationIcon from '../components/NotificationIcon';
import PincodeHeader from '../components/PincodeHeader';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ServicesStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Stack.Screen
        name="ServiceRequest"
        component={ServiceRequestScreen}
        options={({navigation}) => ({
          title: t('services.requestService'),
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="ServiceHistory"
        component={ServiceHistoryScreen}
        options={({navigation}) => ({
          title: t('services.serviceHistory'),
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="ActiveService"
        component={ActiveServiceScreen}
        options={({navigation}) => ({
          title: t('services.activeService'),
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="ProvidersList"
        component={ProvidersListScreen}
        options={({navigation}) => ({
          title: t('providers.browseProviders'),
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="ProviderDetails"
        component={ProviderDetailsScreen}
        options={{title: t('providers.providerDetails')}}
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

  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'My Profile'}}
      />
    </Stack.Navigator>
  );
});

const MainTabs = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Services':
              iconName = focused ? 'build' : 'build-outline';
              break;
            case 'Providers':
              iconName = focused ? 'people' : 'people-outline';
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

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
          borderWidth: 0,
        },
        tabBarItemStyle: {
          borderWidth: 0,
          borderRightWidth: 0,
          borderLeftWidth: 0,
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            style={[
              props.style,
              {
                borderWidth: 0,
                borderRightWidth: 0,
                borderLeftWidth: 0,
                borderColor: 'transparent',
              },
            ]}
          />
        ),
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}>
      <Tab.Screen 
        name="Services" 
        component={ServicesStack} 
        options={{title: t('common.request')}}
      />
      <Tab.Screen 
        name="Providers" 
        component={ProvidersListScreen}
        options={{title: t('common.browse')}}
      />
      <Tab.Screen 
        name="History" 
        component={ServiceHistoryScreen}
        options={{title: t('common.history')}}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack}
        options={{title: t('common.settings')}}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
