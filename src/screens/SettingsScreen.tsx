import React, {useEffect, useState} from 'react';
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
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Select} from 'sapvt-ltd-app-packages';
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
import {updateUserProfile} from '../services/authService';
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
    setAlertModal({
      visible: true,
      title: t('settings.privacyPolicy'),
      message: t('settings.privacyPolicyMessage'),
      type: 'info',
    });
  };

  const handleTerms = () => {
    closeSidebar();
    setAlertModal({
      visible: true,
      title: t('settings.termsOfService'),
      message: t('settings.termsOfServiceMessage'),
      type: 'info',
    });
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
      setSuccessMessage(t('profile.profileUpdated') || 'Profile updated');
      setShowSuccessModal(true);
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || 'Failed to update profile',
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
        <TouchableOpacity onPress={openSidebar} style={styles.menuBtn}>
          <Icon name="menu" size={26} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {!currentUser ? (
          <TouchableOpacity
            style={[styles.profileHeader, {backgroundColor: theme.card}]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}>
            <View
              style={[
                styles.profileHeaderImage,
                styles.profileHeaderImagePlaceholder,
                {backgroundColor: theme.primary},
              ]}>
              <Icon name="person" size={50} color="#fff" />
            </View>
            <Text style={[styles.profileHeaderName, {color: theme.text}]}>
              {t('auth.continueAsGuest')}
            </Text>
            <Text style={[styles.profileHeaderPhone, {color: theme.primary}]}>
              {t('auth.loginWithMobile')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.profileHeader, {backgroundColor: theme.card}]}>
            {(() => {
              const imageUrl = (currentUser.profileImage || '').trim();
              const hasValidImage =
                imageUrl !== '' &&
                !imageError &&
                (imageUrl.startsWith('http') ||
                  imageUrl.startsWith('file://') ||
                  imageUrl.startsWith('content://'));
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
                <View
                  style={[
                    styles.profileHeaderImage,
                    styles.profileHeaderImagePlaceholder,
                    {backgroundColor: theme.primary},
                  ]}>
                  <Text style={styles.profileHeaderInitials}>
                    {getInitials(currentUser.name || '')}
                  </Text>
                </View>
              );
            })()}
            <Text style={[styles.profileHeaderName, {color: theme.text}]}>
              {currentUser.name}
            </Text>
            <Text style={[styles.profileHeaderPhone, {color: theme.primary}]}>
              {phoneDisplay}
            </Text>
          </View>
        )}

        {currentUser ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitleInline, {color: theme.textSecondary}]}>
                {(t('profile.personalInformation') || 'PERSONAL INFORMATION').toUpperCase()}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (isEditing) void handleSaveProfile();
                  else setIsEditing(true);
                }}
                style={styles.editBtn}
                disabled={savingProfile}>
                {savingProfile ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Icon
                    name={isEditing ? 'checkmark' : 'create-outline'}
                    size={22}
                    color={theme.primary}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.infoCard, {backgroundColor: theme.card}]}>
              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {t('profile.fullName') || 'Full Name'}
              </Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.fieldInput,
                    {color: theme.text, borderColor: theme.border},
                  ]}
                  value={name}
                  onChangeText={setName}
                />
              ) : (
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {name || '—'}
                </Text>
              )}

              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {t('profile.primaryPhone') || 'Primary Phone'}
              </Text>
              <View style={styles.lockedRow}>
                <Text style={[styles.fieldValue, {color: theme.text, flex: 1}]}>
                  {phoneDisplay}
                </Text>
                <Icon name="lock-closed" size={16} color={theme.textSecondary} />
              </View>
              <Text style={styles.verifiedHint}>
                {t('profile.verifiedCannotChange') ||
                  'Verified (Cannot be changed)'}
              </Text>

              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {t('profile.gender') || 'Gender'}
              </Text>
              {isEditing ? (
                <Select
                  options={genderOptions.map((o) => ({value: o, label: o}))}
                  value={gender}
                  placeholder={t('profile.selectGender') || 'Select gender'}
                  onChange={setGender}
                />
              ) : (
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {gender || '—'}
                </Text>
              )}

              <Text
                style={[
                  styles.fieldLabel,
                  {color: theme.textSecondary, marginTop: 12},
                ]}>
                {t('profile.serviceAddress') || 'Service Address'}
              </Text>
              {isEditing ? (
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
              ) : (
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
              )}

              {isEditing ? (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, {borderColor: theme.border}]}
                    onPress={() => setIsEditing(false)}>
                    <Text style={{color: theme.text}}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, {backgroundColor: theme.primary}]}
                    onPress={() => void handleSaveProfile()}
                    disabled={savingProfile}>
                    <Text style={{color: '#fff', fontWeight: '600'}}>
                      {t('common.save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            ACCOUNT
          </Text>
          {currentUser ? (
            <SettingItem
              icon="log-out-outline"
              title={t('auth.logout')}
              subtitle={t('settings.logoutSubtitle')}
              onPress={() => setShowLogoutModal(true)}
            />
          ) : (
            <SettingItem
              icon="log-in-outline"
              title={t('auth.login')}
              subtitle={t('auth.loginWithPinLead')}
              onPress={() => navigation.navigate('Login')}
            />
          )}
        </View>
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
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: theme.primary}]}
              onPress={handleEmailSupport}>
              <Text style={styles.actionButtonText}>{t('settings.emailUs')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: '#4CAF50'}]}
              onPress={handleCallSupport}>
              <Text style={styles.actionButtonText}>{t('settings.callUs')}</Text>
            </TouchableOpacity>
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
        title="Success"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: {fontSize: 18, fontWeight: '700'},
  menuBtn: {padding: 4},
  container: {flex: 1},
  content: {paddingVertical: 16},
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
  fieldValue: {fontSize: 15, lineHeight: 22},
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
