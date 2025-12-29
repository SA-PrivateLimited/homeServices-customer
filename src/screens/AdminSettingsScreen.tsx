import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import firebaseApp from '@react-native-firebase/app';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';

// Helper function to check if Firebase is initialized
const isFirebaseInitialized = (): boolean => {
  try {
    firebaseApp.app();
    return true;
  } catch (error) {
    return false;
  }
};

export default function SettingsScreen({navigation}: any) {
  const {currentUser: storeUser, isDarkMode, toggleTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  // Safely get current user only if Firebase is initialized
  const authUser = isFirebaseInitialized() ? auth().currentUser : null;
  const currentUser = storeUser || authUser;

  const handleLogout = () => {
    if (!isFirebaseInitialized()) {
      // If Firebase not initialized, just navigate to login
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth().signOut();
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          } catch (error) {
            // Even if logout fails, navigate to login
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          }
        },
      },
    ]);
  };

  const handleChangeRole = () => {
    Alert.alert(
      'Change Role',
      'As an admin, you can change your role, but you will lose admin privileges. Admin role can only be reassigned by another admin. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Continue',
          onPress: () => {
            navigation.navigate('RoleSelection');
          },
        },
      ],
    );
  };

  const MenuItem = ({
    icon,
    title,
    onPress,
    color,
  }: {
    icon: string;
    title: string;
    onPress: () => void;
    color?: string;
  }) => {
    const iconColor = color || theme.text;
    const textColor = color || theme.text;
    return (
      <TouchableOpacity 
        style={[styles.menuItem, {borderBottomColor: theme.border}]} 
        onPress={onPress}>
      <View style={styles.menuItemLeft}>
          <Icon name={icon} size={24} color={iconColor} />
          <Text style={[styles.menuItemText, {color: textColor}]}>{title}</Text>
      </View>
        <Icon name="chevron-right" size={24} color={theme.textSecondary} />
    </TouchableOpacity>
  );
  };

  return (
    <ScrollView style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={[styles.header, {backgroundColor: theme.primary}]}>
        <View style={styles.avatar}>
          <Icon name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.email}>
          {currentUser?.email || authUser?.email || 'Not available'}
        </Text>
        <Text style={styles.role}>Administrator</Text>
      </View>

      <View style={[styles.section, {backgroundColor: theme.card}]}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>ADMINISTRATION</Text>
        <MenuItem
          icon="people"
          title="User Management"
          onPress={() => navigation.navigate('AdminUsersManagement')}
        />
      </View>

      <View style={[styles.section, {backgroundColor: theme.card}]}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>ACCOUNT</Text>
        <MenuItem
          icon="person"
          title="Profile"
          onPress={() => {
            // Profile screen not available in admin navigator
            Alert.alert(
              'Profile',
              'Profile management is not available in the admin panel. Please use the customer app to manage your profile.',
              [{text: 'OK'}]
            );
          }}
        />
        <MenuItem
          icon="compare-arrows"
          title="Change Role"
          onPress={handleChangeRole}
        />
        <MenuItem
          icon="lock"
          title="Change Password"
          onPress={() => Alert.alert('Change Password', 'This feature is coming soon')}
        />
      </View>

      <View style={[styles.section, {backgroundColor: theme.card}]}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>APPEARANCE</Text>
        <View style={[styles.menuItem, {borderBottomColor: theme.border}]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="moon" size={24} color={theme.primary} />
            <View style={styles.menuItemTextContainer}>
              <Text style={[styles.menuItemText, {color: theme.text}]}>Dark Mode</Text>
              <Text style={[styles.menuItemSubtext, {color: theme.textSecondary}]}>
                {isDarkMode ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{false: theme.border, true: theme.primary}}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={[styles.section, {backgroundColor: theme.card}]}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>APP</Text>
        <MenuItem
          icon="notifications"
          title="Notifications"
          onPress={() => Alert.alert('Notifications', 'Notification settings coming soon')}
        />
        <MenuItem
          icon="help"
          title="Help & Support"
          onPress={() => Alert.alert('Help', `Contact support at ${currentUser?.email || authUser?.email || 'support@homeservices.com'}`)}
        />
        <MenuItem
          icon="info"
          title="About"
          onPress={() => Alert.alert('HomeServicesAdmin', 'Version 1.0.0\n\nAdmin portal for HomeServices system')}
        />
      </View>

      <View style={[styles.section, {backgroundColor: theme.card}]}>
        <MenuItem
          icon="exit-to-app"
          title="Logout"
          onPress={handleLogout}
          color="#FF3B30"
        />
      </View>

      <Text style={[styles.version, {color: theme.textSecondary}]}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 30,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  email: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...commonStyles.shadowSmall,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemTextContainer: {
    marginLeft: 12,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  menuItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    padding: 20,
  },
});
