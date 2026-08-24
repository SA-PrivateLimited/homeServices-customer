import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Linking,
  Modal,
  Animated,
  Dimensions,
  Pressable,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Button, customerDisplayName, isCustomerProfileIncomplete} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import {COPYRIGHT_OWNER} from '@env';
import {logoutCustomer} from '../services/session';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import AlertModal from '../components/AlertModal';
import SuccessModal from '../components/SuccessModal';
import ServiceAddressFields, {
  type ServiceAddressValue,
} from '../components/ServiceAddressFields';
import {SettingsProfileHeader} from '../components/settings/SettingsProfileHeader';
import {SettingsPersonalInformation} from '../components/settings/SettingsPersonalInformation';
import {SettingsAccountSection} from '../components/settings/SettingsAccountSection';
import {updateUserProfile} from '../services/authService';
import {deleteMe} from '../services/api/usersApi';
import {PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL} from '../config/legal';
import useTranslation from '../hooks/useTranslation';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.82);

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const {
    isDarkMode,
    toggleTheme,
    currentUser,
    setCurrentUser,
    language,
    setLanguage,
  } = useStore();
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarX] = useState(() => new Animated.Value(DRAWER_WIDTH));

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  const [serviceAddress, setServiceAddress] = useState<ServiceAddressValue>({
    address: currentUser?.homeAddress?.address || '',
    landmark: (currentUser?.homeAddress as any)?.landmark || '',
    city:
      currentUser?.homeAddress?.city ||
      (currentUser?.homeAddress as any)?.district ||
      '',
    district:
      (currentUser?.homeAddress as any)?.district ||
      currentUser?.homeAddress?.city ||
      '',
    state: currentUser?.homeAddress?.state || '',
    stateId: (currentUser?.homeAddress as any)?.stateId || '',
    districtId: (currentUser?.homeAddress as any)?.districtId || '',
    pincode: currentUser?.homeAddress?.pincode || '',
    latitude: (currentUser?.homeAddress as any)?.latitude,
    longitude: (currentUser?.homeAddress as any)?.longitude,
  });

  const genderOptions = [
    t('profile.male'),
    t('profile.female'),
    t('profile.other'),
  ];

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name || '');
    setGender(currentUser.gender || '');
    setServiceAddress({
      address: currentUser.homeAddress?.address || '',
      landmark: (currentUser.homeAddress as any)?.landmark || '',
      city:
        currentUser.homeAddress?.city ||
        (currentUser.homeAddress as any)?.district ||
        '',
      district:
        (currentUser.homeAddress as any)?.district ||
        currentUser.homeAddress?.city ||
        '',
      state: currentUser.homeAddress?.state || '',
      stateId: (currentUser.homeAddress as any)?.stateId || '',
      districtId: (currentUser.homeAddress as any)?.districtId || '',
      pincode: currentUser.homeAddress?.pincode || '',
      latitude: (currentUser.homeAddress as any)?.latitude,
      longitude: (currentUser.homeAddress as any)?.longitude,
    });
  }, [currentUser]);

  const openSidebar = () => {
    setShowSidebar(true);
    Animated.timing(sidebarX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarX, {
      toValue: DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) setShowSidebar(false);
    });
  };

  const handleHelpSupport = () => {
    closeSidebar();
    setShowHelpSupportModal(true);
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@sa-privatelimited.com').catch(() => {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('settings.unableToOpenEmail'),
        type: 'error',
      });
    });
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+918210900726').catch(() => {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('settings.unableToMakeCall'),
        type: 'error',
      });
    });
  };

  const handleAbout = () => {
    closeSidebar();
    setAlertModal({
      visible: true,
      title: t('settings.aboutHomeServices'),
      message: t('settings.aboutMessage', {
        version: '1.0.0',
        copyright: COPYRIGHT_OWNER || 'SA-PrivateLimited',
      }),
      type: 'info',
    });
  };

  const handlePrivacy = () => {
    closeSidebar();
    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  const handleTerms = () => {
    closeSidebar();
    void Linking.openURL(TERMS_OF_SERVICE_URL);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      String(t('settings.deleteAccount') || 'Delete account'),
      String(
        t('settings.deleteAccountConfirm') ||
          'This permanently deletes your account. This cannot be undone.',
      ),
      [
        {text: String(t('common.cancel') || 'Cancel'), style: 'cancel'},
        {
          text: String(t('settings.deleteAccount') || 'Delete account'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteMe();
                await logoutCustomer();
                await setCurrentUser(null);
              } catch (error: any) {
                setAlertModal({
                  visible: true,
                  title: String(t('common.error')),
                  message:
                    error?.message ||
                    String(t('settings.deleteAccountFailed')),
                  type: 'error',
                });
              }
            })();
          },
        },
      ],
    );
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setShowLogoutModal(false);
    try {
      await logoutCustomer();
      await setCurrentUser(null);
      navigation.reset({index: 0, routes: [{name: 'Main'}]});
    } catch {
      try {
        await setCurrentUser(null);
      } catch {
        // ignore
      }
      navigation.reset({index: 0, routes: [{name: 'Main'}]});
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    if (!name.trim()) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('profile.pleaseEnterName'),
        type: 'error',
      });
      return;
    }
    setSavingProfile(true);
    try {
      const userId = currentUser.id || currentUser._id || '';
      const homeAddress =
        serviceAddress.address || serviceAddress.pincode
          ? {
              address: serviceAddress.address || '',
              landmark: serviceAddress.landmark || '',
              city: serviceAddress.district || serviceAddress.city || '',
              district: serviceAddress.district || serviceAddress.city || '',
              state: serviceAddress.state || '',
              stateId: serviceAddress.stateId || '',
              districtId: serviceAddress.districtId || '',
              pincode: serviceAddress.pincode || '',
              latitude: serviceAddress.latitude,
              longitude: serviceAddress.longitude,
            }
          : null;
      const updatedUser = await updateUserProfile(userId, {
        name: name.trim(),
        gender: gender || undefined,
        homeAddress,
      });
      await setCurrentUser(updatedUser);
      setIsEditing(false);
      setSuccessMessage(String(t('profile.profileUpdated')));
      setShowSuccessModal(true);
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || String(t('profile.failedToUpdateProfile')),
        type: 'error',
      });
    } finally {
      setSavingProfile(false);
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
          <Text style={[styles.settingTitle, {color: theme.text}]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.settingSubtitle, {color: theme.textSecondary}]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightComponent ||
        (onPress ? (
          <Icon name="chevron-forward" size={20} color={theme.textSecondary} />
        ) : null)}
    </TouchableOpacity>
  );

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.charAt(0).toUpperCase();
  };

  const [imageError, setImageError] = useState(false);
  const phoneDisplay =
    currentUser?.phone || currentUser?.phoneNumber || t('profile.notAvailable');
  const identityName = customerDisplayName(currentUser);
  const profileIncomplete = isCustomerProfileIncomplete(currentUser);

  return (
    <View style={[styles.root, {backgroundColor: theme.background}]}>
      <View
        style={[
          styles.topBar,
          {backgroundColor: theme.card, borderBottomColor: theme.border},
        ]}>
        <Text style={[styles.topBarTitle, {color: theme.text}]}>
          {t('settings.title') || 'Settings'}
        </Text>
        <TouchableOpacity
          onPress={openSidebar}
          style={styles.menuBtn}
          accessibilityRole="button"
          accessibilityLabel={t('settings.menu') || 'Menu'}>
          <Icon name="menu" size={26} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsHorizontalScrollIndicator={false}>
        <SettingsProfileHeader
          theme={theme}
          isGuest={!currentUser}
          name={identityName}
          phone={phoneDisplay}
          lead={
            profileIncomplete
              ? String(t('profile.incomplete') || 'Profile incomplete')
              : t('settings.manageLead')
          }
          verifiedLabel={t('profile.verified')}
          guestLabel={t('auth.continueAsGuest')}
          guestSubtitle={t('auth.loginWithMobile')}
          imageUrl={(currentUser?.profileImage || '').trim()}
          imageError={imageError}
          initials={getInitials(identityName || '')}
          onImageError={() => setImageError(true)}
          onGuestPress={() => navigation.navigate('Login')}
        />

        {currentUser ? (
          <SettingsPersonalInformation
            theme={theme}
            title={(
              t('profile.personalInformation') || 'PERSONAL INFORMATION'
            ).toUpperCase()}
            editLabel={t('common.edit')}
            saveLabel={t('common.save')}
            cancelLabel={t('common.cancel')}
            isEditing={isEditing}
            saving={savingProfile}
            nameLabel={t('profile.fullName') || 'Full Name'}
            name={name}
            onNameChange={setName}
            phoneLabel={t('profile.primaryPhone') || 'Primary Phone'}
            phone={phoneDisplay}
            phoneLockedHint={String(t('profile.verifiedCannotChange'))}
            verifiedLabel={t('profile.verified')}
            genderLabel={t('profile.gender') || 'Gender'}
            genderPlaceholder={t('profile.selectGender') || 'Select gender'}
            gender={gender}
            genderOptions={genderOptions}
            onGenderChange={setGender}
            addressLabel={t('profile.serviceAddress') || 'Service Address'}
            addressEditor={
              <ServiceAddressFields
                value={serviceAddress}
                onChange={setServiceAddress}
                theme={theme}
                editable
                showUseCurrentLocation
                useCurrentLabel={
                  t('profile.useCurrentLocation') || 'Use current location'
                }
                currentLocationLabel={
                  t('profile.currentLocation') || 'Current location'
                }
              />
            }
            addressView={
              <View>
                {typeof serviceAddress.latitude === 'number' &&
                typeof serviceAddress.longitude === 'number' ? (
                  <>
                    <Text
                      style={[
                        styles.fieldLabel,
                        {color: theme.textSecondary, marginTop: 4},
                      ]}>
                      {t('profile.currentLocation') || 'Current location'}
                    </Text>
                    <Text style={[styles.fieldValue, {color: theme.text}]}>
                      {serviceAddress.latitude.toFixed(5)},{' '}
                      {serviceAddress.longitude.toFixed(5)}
                    </Text>
                  </>
                ) : null}
                <Text
                  style={[
                    styles.fieldLabel,
                    {color: theme.textSecondary, marginTop: 8},
                  ]}>
                  {t('profile.address') || 'Address'}
                </Text>
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {serviceAddress.address || '—'}
                </Text>
                <Text
                  style={[
                    styles.fieldLabel,
                    {color: theme.textSecondary, marginTop: 8},
                  ]}>
                  {t('profile.landmark') || 'Landmark'}
                </Text>
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {serviceAddress.landmark || '—'}
                </Text>
                <Text
                  style={[
                    styles.fieldLabel,
                    {color: theme.textSecondary, marginTop: 8},
                  ]}>
                  {t('profile.state') || 'State'}
                </Text>
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {serviceAddress.state || '—'}
                </Text>
                <Text
                  style={[
                    styles.fieldLabel,
                    {color: theme.textSecondary, marginTop: 8},
                  ]}>
                  {t('profile.district') || 'District'}
                </Text>
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {serviceAddress.district || serviceAddress.city || '—'}
                </Text>
                <Text
                  style={[
                    styles.fieldLabel,
                    {color: theme.textSecondary, marginTop: 8},
                  ]}>
                  {t('profile.pincode') || 'Pincode'}
                </Text>
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {serviceAddress.pincode || '—'}
                </Text>
              </View>
            }
            successMessage={successMessage}
            onToggleEdit={() => {
              if (isEditing) void handleSaveProfile();
              else setIsEditing(true);
            }}
            onSave={() => void handleSaveProfile()}
            onCancel={() => setIsEditing(false)}
          />
        ) : null}

        <SettingsAccountSection
          theme={theme}
          title={(t('profile.account') || 'ACCOUNT').toUpperCase()}
          actionLabel={currentUser ? t('auth.logout') : t('auth.login')}
          actionHint={
            currentUser
              ? t('settings.logoutSubtitle')
              : t('auth.loginWithPinLead')
          }
          variant={currentUser ? 'logout' : 'login'}
          onAction={() => {
            if (currentUser) setShowLogoutModal(true);
            else navigation.navigate('Login');
          }}
        />
        {currentUser ? (
          <SettingsAccountSection
            theme={theme}
            title=""
            actionLabel={t('settings.deleteAccount') || 'Delete account'}
            actionHint={
              t('settings.deleteAccountHint') ||
              'Permanently remove your data from this app'
            }
            variant="logout"
            onAction={handleDeleteAccount}
          />
        ) : null}
      </ScrollView>

      {showSidebar ? (
        <View style={styles.sidebarRoot} pointerEvents="box-none">
          <Pressable style={styles.sidebarBackdrop} onPress={closeSidebar} />
          <Animated.View
            style={[
              styles.sidebar,
              {
                backgroundColor: theme.card,
                transform: [{translateX: sidebarX}],
              },
            ]}>
            <View style={styles.sidebarHeader}>
              <Text style={[styles.sidebarTitle, {color: theme.text}]}>
                {t('settings.menu') || 'Menu'}
              </Text>
              <TouchableOpacity onPress={closeSidebar}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={[styles.sidebarSection, {color: theme.textSecondary}]}>
                {t('settings.theme').toUpperCase()}
              </Text>
              <SettingItem
                icon="moon"
                title={t('settings.darkMode')}
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
                subtitle={
                  language === 'en' ? t('settings.english') : t('settings.hindi')
                }
                onPress={async () => {
                  await setLanguage(language === 'en' ? 'hi' : 'en');
                  setSuccessMessage(t('settings.languageChanged'));
                  setShowSuccessModal(true);
                }}
              />
              <Text style={[styles.sidebarSection, {color: theme.textSecondary}]}>
                {t('settings.support')}
              </Text>
              <SettingItem
                icon="person-add"
                title={t('recommendations.shareContact')}
                onPress={() => {
                  closeSidebar();
                  navigation.navigate('ShareContactRecommendation');
                }}
              />
              <SettingItem
                icon="help-circle"
                title={t('settings.helpSupport')}
                onPress={handleHelpSupport}
              />
              <Text style={[styles.sidebarSection, {color: theme.textSecondary}]}>
                {t('settings.information')}
              </Text>
              <SettingItem
                icon="information-circle"
                title={t('settings.about')}
                onPress={handleAbout}
              />
              <SettingItem
                icon="shield-checkmark"
                title={t('settings.privacyPolicy')}
                onPress={handlePrivacy}
              />
              <SettingItem
                icon="document-text"
                title={t('settings.termsOfService')}
                onPress={handleTerms}
              />
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}

      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <Modal
        visible={showHelpSupportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelpSupportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {t('settings.helpSupport')}
              </Text>
              <TouchableOpacity onPress={() => setShowHelpSupportModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <Button
              title={t('settings.emailUs')}
              variant="primary"
              block
              onPress={handleEmailSupport}
              colors={{
                primary: theme.primary,
                card: theme.card,
                text: theme.text,
                border: theme.border,
              }}
            />
            <Button
              title={t('settings.callUs')}
              variant="primary"
              block
              onPress={handleCallSupport}
              colors={{
                primary: theme.success,
                card: theme.card,
                text: theme.text,
                border: theme.border,
              }}
            />
          </View>
        </View>
      </Modal>

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({...alertModal, visible: false})}
      />
      <SuccessModal
        visible={showSuccessModal}
        title={String(t('common.success'))}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, overflow: 'hidden'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: {fontSize: 18, fontWeight: '700'},
  menuBtn: {padding: 8, minWidth: 40, minHeight: 40, justifyContent: 'center', alignItems: 'center'},
  container: {flex: 1},
  content: {paddingVertical: 12, paddingBottom: 24},
  section: {marginBottom: 20},
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitleInline: {fontSize: 12, fontWeight: '600', letterSpacing: 1},
  editBtn: {padding: 4},
  infoCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    ...commonStyles.shadowSmall,
  },
  fieldLabel: {fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 4},
  fieldValue: {fontSize: 15, lineHeight: 22, fontWeight: '600'},
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  lockedRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  verifiedHint: {fontSize: 12, marginTop: 2, color: '#2F855A'},
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveBtn: {borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10},
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    ...commonStyles.shadowSmall,
  },
  settingLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  settingText: {marginLeft: 12, flex: 1},
  settingTitle: {fontSize: 15, fontWeight: '500'},
  settingSubtitle: {fontSize: 12, marginTop: 2},
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    ...commonStyles.shadowSmall,
  },
  profileHeaderImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  profileHeaderImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderInitials: {fontSize: 36, fontWeight: 'bold', color: '#fff'},
  profileHeaderName: {fontSize: 22, fontWeight: 'bold', marginBottom: 4},
  profileHeaderPhone: {fontSize: 14, marginTop: 4},
  sidebarRoot: {...StyleSheet.absoluteFillObject, zIndex: 40},
  sidebarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sidebarTitle: {fontSize: 18, fontWeight: '700'},
  sidebarSection: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {borderRadius: 16, padding: 20, gap: 10},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {fontSize: 18, fontWeight: '700'},
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {color: '#fff', fontWeight: '600'},
});

export default SettingsScreen;
