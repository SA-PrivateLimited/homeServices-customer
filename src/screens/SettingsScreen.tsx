import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import {COPYRIGHT_OWNER} from '@env';
import authService from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const {isDarkMode, toggleTheme, currentUser, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleAbout = () => {
    Alert.alert(
      'About HomeServices',
      `Version: 1.0.0\n\nHomeServices is a home services platform that connects customers with verified service providers for plumbing, electrical work, carpentry, AC repair, and more.\n\n© 2025 ${COPYRIGHT_OWNER || 'SA-PrivateLimited'}. All rights reserved.`,
      [{text: 'OK'}],
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'HomeServices respects your privacy. Your service request data is securely stored and encrypted. We do not share your personal information with third parties without your consent.\n\nAll service transactions and personal information are protected under our privacy policy.',
      [{text: 'OK'}],
    );
  };

  const handleTerms = () => {
    Alert.alert(
      'Terms of Service',
      'HomeServices provides home service connections between customers and verified service providers.\n\nBy using this app, you agree to use the services responsibly and understand that service terms are subject to agreement with your service provider.',
      [{text: 'OK'}],
    );
  };

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await authService.logout();
      setCurrentUser(null);
      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRestartAppTour = () => {
    Alert.alert(
      'Restart App Tour',
      'This will show you the interactive guide again when you visit different screens. Would you like to restart the app tour?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Restart Tour',
          onPress: async () => {
            try {
              const currentAuthUser = auth().currentUser;
              if (!currentAuthUser) return;

              // Clear all guide completion flags from Firestore
              await firestore()
                .collection('users')
                .doc(currentAuthUser.uid)
                .update({
                  hasCompletedGuide: firestore.FieldValue.delete(),
                });

              // Clear all guide completion flags from AsyncStorage
              const keys = await AsyncStorage.getAllKeys();
              const guideKeys = keys.filter(key => key.startsWith('@homeservices_guide_completed'));
              if (guideKeys.length > 0) {
                await AsyncStorage.multiRemove(guideKeys);
              }

              Alert.alert(
                'Success',
                'App tour has been reset! You will see the guide when you visit different screens.',
                [{text: 'OK'}]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to restart app tour. Please try again.');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, {backgroundColor: theme.card}]}
      onPress={onPress}
      disabled={!onPress && !rightComponent}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={22} color={theme.primary} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, {color: theme.text}]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, {color: theme.textSecondary}]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent || (
        onPress && <Icon name="chevron-forward" size={20} color={theme.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const [imageError, setImageError] = React.useState(false);

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.content}>
      {/* Profile Header - Similar to Doctor Profile */}
      {currentUser && (
        <TouchableOpacity 
          style={[styles.profileHeader, {backgroundColor: theme.card}]}
          onPress={() => {
            // Navigate to Profile screen
            navigation.navigate('Profile');
          }}
          activeOpacity={0.7}>
          {(() => {
            const imageUrl = (currentUser.profileImage || '').trim();
            const hasValidImage = imageUrl !== '' && !imageError && 
              (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || 
               imageUrl.startsWith('file://') || imageUrl.startsWith('content://'));
            
            if (hasValidImage) {
              return (
                <Image
                  source={{uri: imageUrl}}
                  style={styles.profileHeaderImage}
                  onError={() => setImageError(true)}
                  resizeMode="cover"
                />
              );
            }
            
            return (
              <View style={[styles.profileHeaderImage, styles.profileHeaderImagePlaceholder, {backgroundColor: theme.primary}]}>
                {currentUser.name && currentUser.name.trim() !== '' ? (
                  <Text style={styles.profileHeaderInitials}>
                    {getInitials(currentUser.name)}
                  </Text>
                ) : (
                  <Icon name="person" size={50} color="#fff" />
                )}
              </View>
            );
          })()}
          <Text style={[styles.profileHeaderName, {color: theme.text}]}>
            {currentUser.name}
          </Text>
          <Text style={[styles.profileHeaderEmail, {color: theme.textSecondary}]}>
            {currentUser.email || auth().currentUser?.email || 'Not available'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          ACCOUNT
        </Text>
        {currentUser && (
          <SettingItem
            icon="person-circle"
            title="Profile"
            subtitle={currentUser.name}
            onPress={() => {
              // Navigate to Profile screen
              navigation.navigate('Profile');
            }}
          />
        )}
        <SettingItem
          icon="log-out-outline"
          title="Logout"
          subtitle="Sign out of your account"
          onPress={handleLogout}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          APPEARANCE
        </Text>
        <SettingItem
          icon="moon"
          title="Dark Mode"
          subtitle={isDarkMode ? 'Enabled' : 'Disabled'}
          rightComponent={
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{false: theme.border, true: theme.primary}}
              thumbColor="#FFFFFF"
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          SUPPORT
        </Text>
        <SettingItem
          icon="help-circle"
          title="Help & Support"
          subtitle="Get help with your consultations"
          onPress={() => navigation.navigate('HelpSupport')}
        />
        <SettingItem
          icon="book"
          title="App Tour"
          subtitle="Restart the interactive guide"
          onPress={handleRestartAppTour}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          INFORMATION
        </Text>
        <SettingItem
          icon="information-circle"
          title="About"
          subtitle="App version and information"
          onPress={handleAbout}
        />
        <SettingItem
          icon="shield-checkmark"
          title="Privacy Policy"
          onPress={handlePrivacy}
        />
        <SettingItem
          icon="document-text"
          title="Terms of Service"
          onPress={handleTerms}
        />
      </View>

      <View style={styles.footer}>
        <Icon name="construct" size={32} color={theme.primary} />
        <Text style={[styles.appName, {color: theme.text}]}>HomeServices</Text>
        <Text style={[styles.version, {color: theme.textSecondary}]}>
          Version 1.0.0
        </Text>
        <Text style={[styles.copyright, {color: theme.textSecondary}]}>
          © 2025 {COPYRIGHT_OWNER || 'SA-PrivateLimited'}
        </Text>
        <Text style={[styles.copyright, {color: theme.textSecondary}]}>
          All rights reserved
        </Text>
        <View style={styles.disclaimer}>
          <Icon name="alert-circle-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.disclaimerText, {color: theme.textSecondary}]}>
            For educational purposes only. Always consult healthcare professionals.
          </Text>
        </View>
      </View>
      
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 20,
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
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  version: {
    fontSize: 14,
    marginTop: 4,
  },
  copyright: {
    fontSize: 12,
    marginTop: 4,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    marginLeft: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 24,
    marginHorizontal: 20,
    borderRadius: 12,
    ...commonStyles.shadowSmall,
  },
  profileHeaderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileHeaderImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderInitials: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileHeaderName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileHeaderEmail: {
    fontSize: 14,
  },
});

export default SettingsScreen;
