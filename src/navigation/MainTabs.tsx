import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

// Screens - Settings (kept for profile management)
import SettingsScreen from '../screens/SettingsScreen';

// Screens - Services
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import ActiveServiceScreen from '../screens/ActiveServiceScreen';
import ProvidersListScreen from '../screens/ProvidersListScreen';
import DoctorDetailsScreen from '../screens/DoctorDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// Components
import NotificationIcon from '../components/NotificationIcon';
import PincodeHeader from '../components/PincodeHeader';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ServicesStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

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
          title: 'Request Service',
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
          title: 'Service History',
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
          title: 'Active Service',
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
          title: 'Browse Providers',
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="ProviderDetails"
        component={DoctorDetailsScreen}
        options={{title: 'Provider Details'}}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

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
        options={{title: 'Request'}}
      />
      <Tab.Screen 
        name="Providers" 
        component={ProvidersListScreen}
        options={{title: 'Browse'}}
      />
      <Tab.Screen 
        name="History" 
        component={ServiceHistoryScreen}
        options={{title: 'History'}}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
