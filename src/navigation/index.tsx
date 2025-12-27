import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

// Screens - Settings
import SettingsScreen from '../screens/SettingsScreen';

// Screens - Authentication
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Screens - Services
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import ActiveServiceScreen from '../screens/ActiveServiceScreen';
import ProvidersListScreen from '../screens/ProvidersListScreen';
import ProviderDetailsScreen from '../screens/ProviderDetailsScreen';
// import VideoCallScreen from '../screens/VideoCallScreen'; // Temporarily disabled

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
        options={{title: 'Request Service'}}
      />
      <Stack.Screen
        name="ServiceHistory"
        component={ServiceHistoryScreen}
        options={{title: 'Service History'}}
      />
      <Stack.Screen
        name="ActiveService"
        component={ActiveServiceScreen}
        options={{title: 'Active Service'}}
      />
      <Stack.Screen
        name="ProvidersList"
        component={ProvidersListScreen}
        options={{title: 'Browse Providers'}}
      />
      <Stack.Screen
        name="ProviderDetails"
        component={ProviderDetailsScreen}
        options={{title: 'Provider Details'}}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'My Profile'}}
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

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
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
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarShowLabel: true,
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
        component={SettingsStack}
        options={{title: 'Settings'}}
      />
    </Tab.Navigator>
  );
};

const Navigation = () => {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // For now, allow access without login (auth is optional)
  // Later can make it required: const isAuthenticated = currentUser !== null;
  const showAuthRequired = false; // Set to true to require login

  return (
    <NavigationContainer
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
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {showAuthRequired && !currentUser ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
        {/* Auth screens accessible from anywhere */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
