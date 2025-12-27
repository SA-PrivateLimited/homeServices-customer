import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';
import PhoneVerificationScreen from '../screens/PhoneVerificationScreen';

// Tab Navigators
import MainTabs from './MainTabs'; // Customer tabs (existing)
import DoctorTabNavigator from './DoctorTabNavigator'; // Provider tabs (new)
import AdminTabNavigator from './AdminTabNavigator'; // Admin tabs (new)

// Shared screens
import AdminConsultationDetailScreen from '../screens/AdminConsultationDetailScreen';
import AdminAddDoctorScreen from '../screens/AdminAddDoctorScreen';
import AdminEditDoctorScreen from '../screens/AdminEditDoctorScreen';
import AdminUsersManagementScreen from '../screens/AdminUsersManagementScreen';
import AdminDoctorApprovalsScreen from '../screens/AdminDoctorApprovalsScreen';
import DoctorProfileSetupScreen from '../screens/DoctorProfileSetupScreen';
import PaymentScreen from '../components/PaymentScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import ActiveServiceScreen from '../screens/ActiveServiceScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userDoc = await firestore()
            .collection('users')
            .doc(authUser.uid)
            .get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            // HomeServices app is for customers only - set role to customer
            const userRoleFromDoc = userData?.role || 'customer';
            setUserRole(userRoleFromDoc);
            setPhoneVerified(userData?.phoneVerified === true);
            
            // Update store with user data
            setCurrentUser({
              id: userDoc.id,
              ...userData,
              createdAt: userData?.createdAt?.toDate(),
              phoneVerified: userData?.phoneVerified === true,
            } as any);
          } else {
            // New user - set as customer for HomeServices app
            setUserRole('customer');
            setPhoneVerified(false);
          }
        } catch (error) {
          setUserRole(null);
          setPhoneVerified(null);
        }
      } else {
        setUserRole(null);
        setPhoneVerified(null);
      }

      setUser(authUser);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  const getInitialRoute = () => {
    if (!user) return 'Login';
    
    // Check if phone is verified - if not, redirect to phone verification
    if (phoneVerified === false) {
      return 'PhoneVerification';
    }
    
    // HomeServices app is for customers only - always go to Main
    return 'Main';
  };

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
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{headerShown: false}}>
        {/* Authentication */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{headerShown: true, title: 'Admin Login'}} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen 
          name="PhoneVerification" 
          component={PhoneVerificationScreen}
          options={{
            headerShown: false,
            gestureEnabled: false, // Prevent back navigation
          }}
        />

        {/* Customer Navigation */}
        <Stack.Screen name="Main" component={MainTabs} />

        {/* Provider Navigation */}
        <Stack.Screen name="DoctorMain" component={DoctorTabNavigator} />

        {/* Admin Navigation */}
        <Stack.Screen name="AdminMain" component={AdminTabNavigator} />

        {/* Shared Screens */}
        <Stack.Screen
          name="ServiceRequest"
          component={ServiceRequestScreen}
          options={{
            headerShown: true,
            title: 'Request Service',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="ServiceHistory"
          component={ServiceHistoryScreen}
          options={{
            headerShown: true,
            title: 'Service History',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="ActiveService"
          component={ActiveServiceScreen}
          options={{
            headerShown: true,
            title: 'Active Service',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="AdminConsultationDetail"
          component={AdminConsultationDetailScreen}
          options={{
            headerShown: true,
            title: 'Consultation Details',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="AddDoctor"
          component={AdminAddDoctorScreen}
          options={{
            headerShown: true,
            title: 'Add Doctor',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="EditDoctor"
          component={AdminEditDoctorScreen}
          options={{
            headerShown: true,
            title: 'Edit Doctor',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="AdminUsersManagement"
          component={AdminUsersManagementScreen}
          options={{
            headerShown: true,
            title: 'User Management',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="DoctorProfileSetup"
          component={DoctorProfileSetupScreen}
          options={{
            headerShown: true,
            title: 'Doctor Profile Setup',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{
            headerShown: true,
            title: 'Payment',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={{
            headerShown: false,
          }}
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
