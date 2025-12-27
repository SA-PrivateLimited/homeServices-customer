import React, {useState, useEffect} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useNavigation} from '@react-navigation/native';

import DoctorAppointmentsScreen from '../screens/DoctorAppointmentsScreen';
import DoctorConsultationsScreen from '../screens/DoctorConsultationsScreen';
import DoctorProfileScreen from '../screens/DoctorProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationIcon from '../components/NotificationIcon';
import PincodeHeader from '../components/PincodeHeader';
import ProfileSetupModal from '../components/ProfileSetupModal';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack wrapper for Appointments with header
const AppointmentsStack = () => {
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
        name="AppointmentsMain"
        component={DoctorAppointmentsScreen}
        options={({navigation}) => ({
          title: 'Appointments',
          headerLeft: () => <PincodeHeader />,
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </Stack.Navigator>
  );
};

// Stack wrapper for Consultations with header
const ConsultationsStack = () => {
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
        name="ConsultationsMain"
        component={DoctorConsultationsScreen}
        options={({navigation}) => ({
          title: 'Consultations',
          headerLeft: () => <PincodeHeader />,
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </Stack.Navigator>
  );
};

export default function DoctorTabNavigator() {
  const navigation = useNavigation();
  const [showProfileSetupModal, setShowProfileSetupModal] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const currentUser = auth().currentUser;

  useEffect(() => {
    // Check if doctor has set up their profile
    if (!currentUser || hasCheckedProfile) return;

    const checkDoctorProfile = async () => {
      try {
        const doctorSnapshot = await firestore()
          .collection('providers')
          .where('email', '==', currentUser.email)
          .get();

        // If no profile exists, show the modal
        if (doctorSnapshot.empty) {
          setShowProfileSetupModal(true);
        }

        setHasCheckedProfile(true);
      } catch (error) {
        setHasCheckedProfile(true);
      }
    };

    checkDoctorProfile();
  }, [currentUser, hasCheckedProfile]);

  const handleSetupNow = () => {
    setShowProfileSetupModal(false);
    // Navigate to profile setup screen
    navigation.navigate('DoctorProfileSetup' as never);
  };

  const handleSetupLater = () => {
    setShowProfileSetupModal(false);
  };

  return (
    <>
      <ProfileSetupModal
        visible={showProfileSetupModal}
        onSetupNow={handleSetupNow}
        onSetupLater={handleSetupLater}
      />

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#34C759',
          tabBarInactiveTintColor: '#8E8E93',
          headerShown: false,
          tabBarStyle: {
            borderWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            borderWidth: 0,
            borderRightWidth: 0,
            borderLeftWidth: 0,
          },
        }}>
        <Tab.Screen
          name="Appointments"
          component={AppointmentsStack}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="event" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Consultations"
          component={ConsultationsStack}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="medical-services" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={DoctorProfileScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
}
