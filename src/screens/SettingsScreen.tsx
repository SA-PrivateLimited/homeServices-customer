import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
  Linking,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import {COPYRIGHT_OWNER} from '@env';
import authService from '../services/authService';
import auth from '@react-native-firebase/auth';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import AlertModal from '../components/AlertModal';
import SuccessModal from '../components/SuccessModal';
import useTranslation from '../hooks/useTranslation';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const {isDarkMode, toggleTheme, currentUser, setCurrentUser, language, setLanguage} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [showHelpSupportModal, setShowHelpSupportModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleHelpSupport = () => {
    setShowHelpSupportModal(true);
  };

  const handleEmailSupport = () => {
    const email = 'support@sa-privatelimited.com';
    Linking.openURL(`mailto:${email}`).catch(() => {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Unable to open email client.',
        type: 'error',
      });
    });
  };

  const handleCallSupport = () => {
    const phoneNumber = '+918210900726';
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Unable to make phone call on this device.',
        type: 'error',
      });
    });
  };

  const handleAbout = () => {
    setAlertModal({
      visible: true,
      title: 'About HomeServices',
      message: `Version: 1.0.0\n\nHomeServices is a home services platform that connects customers with verified service providers for plumbing, electrical work, carpentry, AC repair, and more.\n\n© 2025 ${COPYRIGHT_OWNER || 'SA-PrivateLimited'}. All rights reserved.`,
      type: 'info',
    });
  };

  const handlePrivacy = () => {
    setAlertModal({
      visible: true,
      title: 'Privacy Policy',
      message: 'HomeServices respects your privacy. Your service request data is securely stored and encrypted. We do not share your personal information with third parties without your consent.\n\nAll service transactions and personal information are protected under our privacy policy.',
      type: 'info',
    });
  };

  const handleTerms = () => {
    setAlertModal({
      visible: true,
      title: 'Terms of Service',
      message: 'HomeServices provides home service connections between customers and verified service providers.\n\nBy using this app, you agree to use the services responsibly and understand that service terms are subject to agreement with your service provider.',
      type: 'info',
    });
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
      setAlertModal({
        visible: true,
        title: 'Error',
        message: error.message,
        type: 'error',
      });
    }
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
            Email: {currentUser.email || auth().currentUser?.email || 'Not available'}
          </Text>
          {currentUser.phone && (
            <Text style={[styles.profileHeaderPhone, {color: theme.textSecondary}]}>
              Phone: {currentUser.phone}
            </Text>
          )}
          {(() => {
            const address = currentUser.homeAddress?.address || currentUser.officeAddress?.address;
            const city = currentUser.homeAddress?.city || currentUser.officeAddress?.city;
            const state = currentUser.homeAddress?.state || currentUser.officeAddress?.state;
            const pincode = currentUser.homeAddress?.pincode || currentUser.officeAddress?.pincode;
            
            if (address || city || state || pincode) {
              const addressParts = [];
              if (address) addressParts.push(address);
              if (city) addressParts.push(city);
              if (state) addressParts.push(state);
              if (pincode) addressParts.push(pincode);
              
              return (
                <Text style={[styles.profileHeaderAddress, {color: theme.textSecondary}]}>
                  {addressParts.join(', ')}
                </Text>
              );
            }
            return null;
          })()}
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          ACCOUNT
        </Text>
        {currentUser && (
          <SettingItem
            icon="person-circle"
            title={t('settings.profile')}
            subtitle={currentUser.name}
            onPress={() => {
              // Navigate to Profile screen
              navigation.navigate('Profile');
            }}
          />
        )}
        <SettingItem
          icon="log-out-outline"
          title={t('auth.logout')}
          subtitle={t('auth.logout')}
          onPress={handleLogout}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          {t('settings.theme').toUpperCase()}
        </Text>
        <SettingItem
          icon="moon"
          title={t('settings.darkMode')}
          subtitle={isDarkMode ? t('settings.darkMode') : t('settings.lightMode')}
          rightComponent={
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{false: theme.border, true: theme.primary}}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingItem
          icon="language"
          title={t('settings.language')}
          subtitle={language === 'en' ? t('settings.english') : t('settings.hindi')}
          onPress={async () => {
            const newLanguage = language === 'en' ? 'hi' : 'en';
            await setLanguage(newLanguage);
            setSuccessMessage(t('settings.languageChanged'));
            setShowSuccessModal(true);
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          SUPPORT
        </Text>
        <SettingItem
          icon="help-circle"
          title="Help & Support"
          subtitle="Contact us for assistance"
          onPress={handleHelpSupport}
        />
        {__DEV__ && (
          <SettingItem
            icon="notifications"
            title="Test Notification"
            subtitle="Send a test push notification"
            onPress={async () => {
              try {
                const sendTest = require('../utils/sendTestNotification').default;
                await sendTest('Test notification from HomeServices app');
                setSuccessMessage('Test notification sent! Check your notifications.');
                setShowSuccessModal(true);
              } catch (error: any) {
                setAlertModal({
                  visible: true,
                  title: 'Error',
                  message: error?.message || error?.code || 'Failed to send test notification',
                  type: 'error',
                });
              }
            }}
          />
        )}
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
            For quality home services, always verify service providers and read terms before booking.
          </Text>
        </View>
      </View>
      
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Help & Support Modal */}
      <Modal
        visible={showHelpSupportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpSupportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>Help & Support</Text>
              <TouchableOpacity
                onPress={() => setShowHelpSupportModal(false)}
                style={styles.modalCloseButton}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.supportInfo}>
              <View style={styles.supportItem}>
                <Icon name="mail-outline" size={24} color={theme.primary} />
                <View style={styles.supportDetails}>
                  <Text style={[styles.supportLabel, {color: theme.textSecondary}]}>Email</Text>
                  <Text style={[styles.supportValue, {color: theme.text}]}>support@sa-privatelimited.com</Text>
                </View>
              </View>
              
              <View style={styles.supportItem}>
                <Icon name="call-outline" size={24} color={theme.primary} />
                <View style={styles.supportDetails}>
                  <Text style={[styles.supportLabel, {color: theme.textSecondary}]}>Phone</Text>
                  <Text style={[styles.supportValue, {color: theme.text}]}>+91 8210900726</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: theme.primary}]}
                onPress={handleEmailSupport}>
                <Icon name="mail" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Email Us</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.callButton, {backgroundColor: '#4CAF50'}]}
                onPress={handleCallSupport}>
                <Icon name="call" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Call Us</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({...alertModal, visible: false})}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
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
  profileHeaderPhone: {
    fontSize: 14,
    marginTop: 4,
  },
  profileHeaderAddress: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    ...commonStyles.shadowLarge,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  supportInfo: {
    marginBottom: 24,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  supportDetails: {
    marginLeft: 16,
    flex: 1,
  },
  supportLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  supportValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  callButton: {
    marginLeft: 0,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
