import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import authService from '../services/authService';

type UserRole = 'patient' | 'doctor' | 'admin';

interface RoleSelectionScreenProps {
  navigation: any;
}

export default function RoleSelectionScreen({navigation}: RoleSelectionScreenProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const {setCurrentUser, currentUser} = useStore();

  // SECURITY: Only allow role selection for new users (no existing role)
  // If user already has a role, redirect them (role changes must be done by admin)
  React.useEffect(() => {
    if (currentUser?.role) {
      // User already has a role, redirect based on role
      if (currentUser.role === 'admin') {
        navigation.replace('AdminMain');
      } else if (currentUser.role === 'provider') {
        navigation.replace('DoctorMain');
      } else {
        navigation.replace('Main');
      }
    }
  }, [currentUser?.role, navigation]);

  const handleRoleSelection = async (role: UserRole) => {
    // SECURITY: Prevent users from selecting admin role
    if (role === 'admin') {
      alert('Admin role cannot be self-assigned. Please contact system administrator.');
      return;
    }

    // SECURITY: Only allow role selection if user doesn't have a role yet
    if (currentUser?.role) {
      alert('You already have a role assigned. Role changes must be done by an administrator.');
      return;
    }

    setSelectedRole(role);
    setLoading(true);

    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // SECURITY: Only allow customer or provider roles to be set by new users
      const allowedRoles: UserRole[] = ['customer', 'provider'];
      if (!allowedRoles.includes(role)) {
        throw new Error('Invalid role selection. Admin role can only be assigned by system administrators.');
      }

      // Update user document with selected role (only works if role doesn't exist)
      await firestore().collection('users').doc(user.uid).set(
        {
          role: role,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );


      // Refresh user data from Firestore to get updated role
      const updatedUser = await authService.getCurrentUser();
      if (updatedUser) {
        await setCurrentUser(updatedUser);
      }

      // Navigate based on role
      if (role === 'customer') {
        navigation.replace('Main');
      } else if (role === 'provider') {
        navigation.replace('DoctorMain');
      }
    } catch (error) {
      alert('Failed to set user role. Please try again. If you already have a role, contact an administrator to change it.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {currentUser?.role ? 'Change Your Role' : 'Welcome to HomeServices'}
        </Text>
        <Text style={styles.subtitle}>
          {currentUser?.role
            ? 'Select a new role for your account'
            : 'Please select your role'}
        </Text>

        <View style={styles.roleContainer}>
          {/* Customer Role Card */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'customer' && styles.roleCardSelected,
            ]}
            onPress={() => handleRoleSelection('customer')}
            disabled={loading}>
            <View
              style={[
                styles.iconContainer,
                {backgroundColor: '#4A90E2'},
              ]}>
              <Icon name="person" size={48} color="#fff" />
            </View>
            <Text style={styles.roleTitle}>Customer</Text>
            <Text style={styles.roleDescription}>
              Request home services, track service requests, and connect with service providers
            </Text>
          </TouchableOpacity>

          {/* Provider Role Card */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'provider' && styles.roleCardSelected,
            ]}
            onPress={() => handleRoleSelection('provider')}
            disabled={loading}>
            <View
              style={[
                styles.iconContainer,
                {backgroundColor: '#34C759'},
              ]}>
              <Icon name="handyman" size={48} color="#fff" />
            </View>
            <Text style={styles.roleTitle}>Service Provider</Text>
            <Text style={styles.roleDescription}>
              Accept service requests, manage jobs, and provide home services to customers
            </Text>
          </TouchableOpacity>

          {/* Admin Role Card - REMOVED FOR SECURITY */}
          {/* Admin role cannot be self-assigned. Only system administrators can assign admin roles. */}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Setting up your account...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  roleContainer: {
    gap: 20,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roleCardSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#f0f7ff',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
