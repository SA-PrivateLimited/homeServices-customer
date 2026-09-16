import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
  Animated,
  Dimensions,
  Pressable,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {customerDisplayName, isCustomerProfileIncomplete} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {COPYRIGHT_OWNER} from '@env';
import {getStoredJwt, logoutCustomer} from '../services/session';
import {SUPPORT_PHONE_TEL} from '../config/support';
import {ACCOUNT_DELETION_INFO_URL} from '../config/legal';
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
import {deleteMe, uploadMyProfileImage} from '../services/api/usersApi';
import useTranslation from '../hooks/useTranslation';
import {HelpSupportPanel} from '../components/help/HelpSupportPanel';
import {ShareAkansoPanel} from '../components/ecosystem/ShareAkansoPanel';
import {NotificationsSettingsCard} from '../components/NotificationsSettingsCard';
import {HeaderAccountActions} from '../components/account/HeaderAccountActions';
import {AppHeaderLeading} from '../components/AppHeaderLeading';
import {formatFullAddressLine} from '../utils/addressDisplay';
import {
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import {getUserFacingErrorMessage} from '../utils/userFacingError';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.82);

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const {
    isDarkMode,
    currentUser,
    setCurrentUser,
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
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAppUpdateModal, setShowAppUpdateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarX] = useState(() => new Animated.Value(DRAWER_WIDTH));

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  const [secondaryPhone, setSecondaryPhone] = useState(() =>
    String(currentUser?.secondaryPhone || '')
      .replace(/\D/g, '')
      .slice(-10),
  );
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
    blockId: (currentUser?.homeAddress as any)?.blockId || '',
    block: (currentUser?.homeAddress as any)?.block || '',
    pincode: currentUser?.homeAddress?.pincode || '',
    latitude: (currentUser?.homeAddress as any)?.latitude,
    longitude: (currentUser?.homeAddress as any)?.longitude,
  });

  const genderOptions = [
    {value: 'Male', label: String(t('gender.male') || t('profile.male') || 'Male')},
    {
      value: 'Female',
      label: String(t('gender.female') || t('profile.female') || 'Female'),
    },
    {
      value: 'Other',
      label: String(t('gender.other') || t('profile.other') || 'Other'),
    },
  ];

  const genderDisplay =
    gender === 'Male'
      ? String(t('gender.male') || 'Male')
      : gender === 'Female'
        ? String(t('gender.female') || 'Female')
        : gender === 'Other'
          ? String(t('gender.other') || 'Other')
          : gender || '—';

  const syncFormFromUser = useCallback(() => {
    if (!currentUser) return;
    setName(currentUser.name || '');
    setGender(currentUser.gender || '');
    setSecondaryPhone(
      String(currentUser.secondaryPhone || '')
        .replace(/\D/g, '')
        .slice(-10),
    );
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
      blockId: (currentUser.homeAddress as any)?.blockId || '',
      block: (currentUser.homeAddress as any)?.block || '',
      pincode: currentUser.homeAddress?.pincode || '',
      latitude: (currentUser.homeAddress as any)?.latitude,
      longitude: (currentUser.homeAddress as any)?.longitude,
    });
  }, [currentUser]);

  useEffect(() => {
    syncFormFromUser();
  }, [syncFormFromUser]);

  const resetEdit = () => {
    syncFormFromUser();
    setIsEditing(false);
  };

  const openSidebar = useCallback(() => {
    setShowSidebar(true);
    Animated.timing(sidebarX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [sidebarX]);

  const closeSidebar = useCallback(() => {
    Animated.timing(sidebarX, {
      toValue: DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) setShowSidebar(false);
    });
  }, [sidebarX]);

  // Web Settings: brand + title left; language / bell / hamburger / avatar right
  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerTitle: () => null,
      headerTitleAlign: 'left',
      headerLeftContainerStyle: {flexGrow: 1, maxWidth: '52%'},
      headerRightContainerStyle: {
        paddingRight: 2,
        alignItems: 'center',
        justifyContent: 'center',
      },
      headerLeft: () => (
        <AppHeaderLeading
          title={String(t('settings.title') || t('nav.settings') || 'Settings')}
        />
      ),
      headerRight: () => (
        <HeaderAccountActions
          navigation={navigation}
          beforeAccount={
            <TouchableOpacity
              onPress={openSidebar}
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel={String(t('settings.menu') || 'Menu')}>
              <Icon name="menu" size={24} color={theme.text} />
            </TouchableOpacity>
          }
        />
      ),
    });
  }, [navigation, t, theme.text, openSidebar]);

  const handleHelpSupport = () => {
    closeSidebar();
    setShowHelpSupportModal(true);
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@akansho.com').catch(() => {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('settings.unableToOpenEmail'),
        type: 'error',
      });
    });
  };

  const handleCallSupport = () => {
    Linking.openURL(SUPPORT_PHONE_TEL).catch(() => {
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
    setShowAboutModal(true);
  };

  const handleAppUpdate = () => {
    closeSidebar();
    setShowAppUpdateModal(true);
  };

  const openPlayStoreUpdate = () => {
    const market = 'market://details?id=com.akansho.customer';
    const web =
      'https://play.google.com/store/apps/details?id=com.akansho.customer';
    void Linking.openURL(market).catch(() => Linking.openURL(web));
    setShowAppUpdateModal(false);
  };

  const handlePrivacy = () => {
    closeSidebar();
    navigation.navigate('LegalDocument', {kind: 'privacy'});
  };

  const handleTerms = () => {
    closeSidebar();
    navigation.navigate('LegalDocument', {kind: 'terms'});
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
                navigation.reset({index: 0, routes: [{name: 'Login'}]});
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
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
    } catch {
      try {
        await setCurrentUser(null);
      } catch {
        // ignore
      }
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
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
    const primaryTen = String(
      currentUser.phone || currentUser.phoneNumber || '',
    )
      .replace(/\D/g, '')
      .slice(-10);
    if (secondaryPhone.length > 0 && secondaryPhone.length !== 10) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: String(
          t('settings.secondaryPhoneInvalid') ||
            'Enter a valid 10-digit mobile number',
        ),
        type: 'error',
      });
      return;
    }
    if (secondaryPhone.length === 10 && secondaryPhone === primaryTen) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: String(
          t('settings.secondaryPhoneSameAsPrimary') ||
            'Secondary number must be different from primary',
        ),
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
              blockId: serviceAddress.blockId || '',
              block: serviceAddress.block || '',
              pincode: serviceAddress.pincode || '',
              latitude: serviceAddress.latitude,
              longitude: serviceAddress.longitude,
            }
          : null;
      const updatedUser = await updateUserProfile(userId, {
        name: name.trim(),
        gender: gender || undefined,
        homeAddress: homeAddress as any,
        secondaryPhone:
          secondaryPhone.length === 10 ? `+91${secondaryPhone}` : (null as any),
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

  const ensureCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickFromCamera = async (): Promise<string | null> => {
    const ok = await ensureCameraPermission();
    if (!ok) return null;
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      cameraType: 'front',
      saveToPhotos: false,
    });
    if (result.didCancel || result.errorCode) return null;
    return result.assets?.[0]?.uri || null;
  };

  const pickFromGallery = async (): Promise<string | null> => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.didCancel || result.errorCode) return null;
    return result.assets?.[0]?.uri || null;
  };

  const handlePhotoPicked = async (uris: string[]) => {
    const uri = String(uris[0] || '').trim();
    if (!uri || !currentUser || uploadingPhoto) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    setPhotoPreviewUri(uri);
    setImageError(false);
    try {
      const result = await uploadMyProfileImage(uri);
      const url = result.profileImage || result.url || '';
      if (!url) {
        throw new Error('Image upload failed. Please try again.');
      }
      await setCurrentUser({
        ...currentUser,
        profileImage: url,
      });
      setPhotoPreviewUri(url);
      setSuccessMessage(String(t('settings.photoUpdated') || 'Profile photo updated'));
      setShowSuccessModal(true);
    } catch (e) {
      setPhotoPreviewUri(null);
      setPhotoError(
        getUserFacingErrorMessage(e, 'generic') ||
          String(t('common.error') || 'Upload failed'),
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    flat,
    textOnly,
  }: {
    icon?: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    /** Drawer / ghost row — no card elevation (web settings-drawer-item) */
    flat?: boolean;
    /** Web drawer: text only, no leading icon */
    textOnly?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        flat ? styles.settingItemFlat : styles.settingItem,
        {
          backgroundColor: flat ? 'transparent' : theme.card,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress && !rightComponent}>
      <View style={styles.settingLeft}>
        {!textOnly && icon ? (
          <Icon name={icon as any} size={22} color={theme.primary} />
        ) : null}
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
        (onPress && !textOnly ? (
          <Icon name="chevron-forward" size={20} color={theme.textSecondary} />
        ) : null)}
    </TouchableOpacity>
  );

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.charAt(0).toUpperCase();
  };

  const phoneDisplay =
    currentUser?.phone || currentUser?.phoneNumber || t('profile.notAvailable');
  const identityName = customerDisplayName(currentUser);
  const profileIncomplete = isCustomerProfileIncomplete(currentUser);
  const headerImageUrl = (
    photoPreviewUri ||
    currentUser?.profileImage ||
    ''
  ).trim();

  return (
    <View style={[styles.root, {backgroundColor: theme.background}]}>
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
          verifiedLabel={t('settings.verified') || t('profile.verified')}
          guestLabel={t('login.continueGuest') || t('auth.continueAsGuest')}
          guestSubtitle={t('settings.guestSubtitle') || t('auth.loginWithMobile')}
          imageUrl={headerImageUrl}
          imageError={imageError}
          initials={getInitials(identityName || '')}
          onImageError={() => setImageError(true)}
          onGuestPress={() => navigation.navigate('Login')}
          canUploadPhoto={Boolean(currentUser)}
          uploadingPhoto={uploadingPhoto}
          cameraLabel={String(t('photo.takePhoto') || 'Take photo')}
          galleryLabel={String(t('photo.chooseGallery') || 'Choose from gallery')}
          photoHint={String(t('photo.hint') || '')}
          photoError={photoError}
          onPickCamera={pickFromCamera}
          onPickGallery={pickFromGallery}
          onPhotoPicked={uris => void handlePhotoPicked(uris)}
        />

        {currentUser ? (
          <SettingsPersonalInformation
            theme={theme}
            title={String(
              t('settings.personalInfo') ||
                t('profile.personalInformation') ||
                'Personal information',
            )}
            subtitle={String(
              t('settings.personalInfoSubtitle') ||
                'Update your personal details',
            )}
            editLabel={t('settings.edit') || t('common.edit')}
            saveLabel={t('common.save') || t('actions.save')}
            cancelLabel={t('common.cancel') || t('actions.cancel')}
            isEditing={isEditing}
            saving={savingProfile}
            nameLabel={t('settings.fullName') || t('profile.fullName') || 'Full name'}
            name={name}
            onNameChange={setName}
            phoneLabel={
              t('settings.primaryPhone') || t('profile.primaryPhone') || 'Primary phone'
            }
            phone={phoneDisplay}
            phoneLockedHint={String(
              t('settings.phoneCannotChange') || t('profile.verifiedCannotChange'),
            )}
            verifiedLabel={t('settings.verified') || t('profile.verified')}
            secondaryPhoneLabel={String(
              t('settings.secondaryPhone') || 'Secondary mobile (optional)',
            )}
            secondaryPhoneHint={String(
              t('settings.secondaryPhoneHint') ||
                'Used if we cannot reach your primary number',
            )}
            secondaryPhonePlaceholder={String(
              t('request.mobilePlaceholder') || '10-digit mobile',
            )}
            secondaryPhone={secondaryPhone}
            secondaryPhoneDisplay={
              secondaryPhone.length === 10 ? `+91 ${secondaryPhone}` : '—'
            }
            onSecondaryPhoneChange={setSecondaryPhone}
            genderLabel={t('settings.gender') || t('profile.gender') || 'Gender'}
            genderPlaceholder={
              t('settings.selectGender') || t('profile.selectGender') || 'Select gender'
            }
            gender={gender}
            genderDisplay={genderDisplay}
            genderOptions={genderOptions}
            onGenderChange={setGender}
            addressLabel={
              t('settings.serviceAddress') ||
              t('profile.serviceAddress') ||
              'Service address'
            }
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
              <Text
                style={[styles.fieldValue, {color: theme.text}]}
                numberOfLines={3}>
                {formatFullAddressLine(serviceAddress) || '—'}
              </Text>
            }
            successMessage={successMessage}
            onToggleEdit={() => setIsEditing(true)}
            onSave={() => void handleSaveProfile()}
            onCancel={resetEdit}
          />
        ) : null}

        {currentUser ? (
          <NotificationsSettingsCard
            theme={theme}
            title={String(
              t('notifications.settingsTitle') || 'Notifications',
            )}
            body={String(
              t('notifications.settingsBody') ||
                'Get updates when partners accept or complete your requests.',
            )}
            enableLabel={String(
              t('notifications.settingsEnable') || 'Turn on notifications',
            )}
            onLabel={String(t('notifications.settingsOn') || 'On')}
            offLabel={String(t('notifications.settingsOff') || 'Off')}
            blockedLabel={String(
              t('notifications.settingsBlocked') ||
                'Blocked in system settings',
            )}
          />
        ) : null}

        <ShareAkansoPanel compact />

        <TouchableOpacity
          style={[
            styles.updateAppBtn,
            {backgroundColor: theme.card, borderColor: theme.border},
          ]}
          onPress={handleAppUpdate}
          accessibilityRole="button">
          <Text style={[styles.updateAppTitle, {color: theme.text}]}>
            {t('appUpdate.title') || 'Update app'}
          </Text>
          <Text style={[styles.updateAppHint, {color: theme.textSecondary}]}>
            {t('appUpdate.hint') || 'Get the latest version. You stay signed in.'}
          </Text>
        </TouchableOpacity>

        {/* Help / About / Privacy / Terms live in the drawer (web Settings parity) */}

        <SettingsAccountSection
          theme={theme}
          title={String(t('account.account') || t('profile.account') || 'Account')}
          actionLabel={
            currentUser
              ? t('settings.logout') || t('auth.logout')
              : t('actions.login') || t('auth.login')
          }
          actionHint={
            currentUser
              ? String(t('settings.logoutHint') || '')
              : String(t('settings.loginHint') || t('auth.loginWithPinLead') || '')
          }
          variant={currentUser ? 'logout' : 'login'}
          onAction={() => {
            if (currentUser) setShowLogoutModal(true);
            else navigation.navigate('Login');
          }}
        />
        {currentUser ? (
          <View style={styles.deleteQuietWrap}>
            <Pressable
              style={styles.deleteQuiet}
              onPress={handleDeleteAccount}
              accessibilityRole="button"
              accessibilityLabel={String(
                t('settings.deleteAccount') || 'Delete account',
              )}>
              <Text style={[styles.deleteQuietText, {color: theme.textSecondary}]}>
                {t('settings.deleteAccount') || 'Delete account'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void Linking.openURL(ACCOUNT_DELETION_INFO_URL).catch(() =>
                  undefined,
                )
              }
              accessibilityRole="link">
              <Text
                style={[styles.deleteLearnMore, {color: theme.textSecondary}]}>
                {t('settings.deleteAccountLearnMore') ||
                  'How deletion works (Privacy Policy)'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.brandMark, {color: theme.textSecondary}]}>
          © {COPYRIGHT_OWNER || 'Akansho'}
        </Text>
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
              <SettingItem
                flat
                textOnly
                title={String(t('settings.helpSupport') || t('help.title'))}
                onPress={handleHelpSupport}
              />
              <SettingItem
                flat
                textOnly
                title={String(t('settings.about'))}
                onPress={handleAbout}
              />
              <SettingItem
                flat
                textOnly
                title={String(t('appUpdate.title') || 'Update app')}
                onPress={handleAppUpdate}
              />
              <SettingItem
                flat
                textOnly
                title={String(t('settings.privacy') || t('settings.privacyPolicy'))}
                onPress={handlePrivacy}
              />
              <SettingItem
                flat
                textOnly
                title={String(t('settings.terms') || t('settings.termsOfService'))}
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
                {t('help.title') || t('settings.helpSupport')}
              </Text>
              <TouchableOpacity onPress={() => setShowHelpSupportModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={{maxHeight: 520}}>
              <HelpSupportPanel surfaceOverride="settings" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAboutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}
            keyboardShouldPersistTaps="handled">
            <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, {color: theme.text}]}>
                  {String(
                    t('settings.aboutBrand', {
                      brand: t('login.productName') || 'Akansho',
                    }) || t('settings.about'),
                  )}
                </Text>
                <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                  <Icon name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <Text style={{color: theme.textSecondary, marginBottom: 4}}>
                {String(t('settings.version', {version: '1.0.0'}) || 'Version 1.0.0')}
              </Text>
              <Text style={[styles.brandMarkCompact, {color: theme.textSecondary}]}>
                © {COPYRIGHT_OWNER || 'Akansho'}
              </Text>
              <ShareAkansoPanel />
              <TouchableOpacity
                style={{marginTop: 8, paddingVertical: 12}}
                onPress={() => {
                  setShowAboutModal(false);
                  setShowAppUpdateModal(true);
                }}>
                <Text style={{color: theme.primary, fontWeight: '700'}}>
                  {t('appUpdate.title') || 'Update app'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.okBtn,
                  {backgroundColor: theme.primary, marginTop: 8},
                ]}
                onPress={() => setShowAboutModal(false)}>
                <Text style={{color: '#fff', fontWeight: '700'}}>
                  {t('actions.ok') || t('common.ok') || 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showAppUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppUpdateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <Text style={[styles.modalTitle, {color: theme.text, marginBottom: 8}]}>
              {t('appUpdate.title') || 'Update app'}
            </Text>
            <Text style={{color: theme.textSecondary, marginBottom: 16}}>
              {t('appUpdate.hint') ||
                'Get the latest version. You stay signed in.'}
            </Text>
            <View style={{flexDirection: 'row', gap: 10}}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {borderColor: theme.border, flex: 1, alignItems: 'center'},
                ]}
                onPress={() => setShowAppUpdateModal(false)}>
                <Text style={{color: theme.text, fontWeight: '600'}}>
                  {t('actions.cancel') || t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.okBtn,
                  {backgroundColor: theme.primary, flex: 1},
                ]}
                onPress={openPlayStoreUpdate}>
                <Text style={{color: '#fff', fontWeight: '700'}}>
                  {t('appUpdate.confirm') || 'Update now'}
                </Text>
              </TouchableOpacity>
            </View>
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
        title={String(t('profile.profileUpdatedTitle') || 'Profile updated')}
        message={successMessage}
        buttonText={String(t('common.done') || 'Done')}
        onClose={() => setShowSuccessModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, overflow: 'hidden'},
  container: {flex: 1},
  content: {paddingVertical: 12, paddingBottom: 24},
  fieldLabel: {fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 4},
  fieldValue: {fontSize: 15, lineHeight: 22, fontWeight: '600'},
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
  },
  settingItemFlat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  updateAppBtn: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  updateAppTitle: {fontSize: 15, fontWeight: '700'},
  updateAppHint: {fontSize: 13, marginTop: 4, lineHeight: 18},
  okBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  settingLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  settingText: {marginLeft: 12, flex: 1},
  settingTitle: {fontSize: 15, fontWeight: '500'},
  settingSubtitle: {fontSize: 12, marginTop: 2},
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
  brandMark: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    opacity: 0.72,
  },
  deleteQuietWrap: {
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  deleteQuiet: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  deleteQuietText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  deleteLearnMore: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  brandMarkCompact: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    opacity: 0.72,
  },
});

export default SettingsScreen;
