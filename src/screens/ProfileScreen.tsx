import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {launchImageLibrary} from 'react-native-image-picker';
import {Select} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
import {getStoredJwt, logoutCustomer} from '../services/session';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import AlertModal from '../components/AlertModal';
import SuccessModal from '../components/SuccessModal';
import useTranslation from '../hooks/useTranslation';
import type {User} from '../services/api/usersApi';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const {isDarkMode, currentUser, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(
    currentUser?.phone || currentUser?.phoneNumber || '',
  );
  const [secondaryPhone, setSecondaryPhone] = useState(currentUser?.secondaryPhone || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  // Address fields
  const [homeAddress, setHomeAddress] = useState({
    address: currentUser?.homeAddress?.address || '',
    city: currentUser?.homeAddress?.city || '',
    state: currentUser?.homeAddress?.state || '',
    pincode: currentUser?.homeAddress?.pincode || '',
  });
  const [officeAddress, setOfficeAddress] = useState({
    address: currentUser?.officeAddress?.address || '',
    city: currentUser?.officeAddress?.city || '',
    state: currentUser?.officeAddress?.state || '',
    pincode: currentUser?.officeAddress?.pincode || '',
  });
  const [sameAsHomeAddress, setSameAsHomeAddress] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(currentUser?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const genderOptions = [t('profile.male'), t('profile.female'), t('profile.other')];

  const formatAddress = (addr: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) => {
    if (!addr?.address && !addr?.city && !addr?.state && !addr?.pincode) {
      return '';
    }
    const base = (addr.address || '').trim();
    const lower = base.toLowerCase();
    const parts: string[] = base ? [base] : [];
    if (addr.city && !lower.includes(addr.city.toLowerCase())) {
      parts.push(addr.city);
    }
    if (addr.state && !lower.includes(addr.state.toLowerCase())) {
      parts.push(addr.state);
    }
    if (addr.pincode && !lower.includes(addr.pincode)) {
      parts.push(addr.pincode);
    }
    return parts.join(', ');
  };


  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets[0].uri) {
        setProfileImage(response.assets[0].uri);
        setImageError(false);
      }
    });
  };

  const applyUserToForm = (user: User) => {
    setName(user.name || '');
    setPhone(user.phone || user.phoneNumber || '');
    setSecondaryPhone(user.secondaryPhone || '');
    setGender(user.gender || '');
    setHomeAddress({
      address: user.homeAddress?.address || '',
      city: user.homeAddress?.city || '',
      state: user.homeAddress?.state || '',
      pincode: user.homeAddress?.pincode || '',
    });
    setOfficeAddress({
      address: user.officeAddress?.address || '',
      city: user.officeAddress?.city || '',
      state: user.officeAddress?.state || '',
      pincode: user.officeAddress?.pincode || '',
    });
    setSameAsHomeAddress(
      !!(
        user.homeAddress?.address &&
        user.officeAddress?.address &&
        user.homeAddress.address === user.officeAddress.address
      ),
    );
    const existingImage = user.profileImage;
    if (
      existingImage &&
      typeof existingImage === 'string' &&
      existingImage.trim() !== '' &&
      (existingImage.startsWith('http://') ||
        existingImage.startsWith('https://') ||
        existingImage.startsWith('file://') ||
        existingImage.startsWith('content://'))
    ) {
      setProfileImage(existingImage.trim());
    } else {
      setProfileImage(null);
    }
    setImageError(false);
  };

  // Load customer profile from Mongo/JWT session
  useEffect(() => {
    const loadCustomerProfile = async () => {
      const jwt = await getStoredJwt();
      if (!jwt) {
        setProfileLoading(false);
        return;
      }

      if (currentUser?.id || currentUser?._id) {
        applyUserToForm(currentUser);
        setProfileLoading(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        if (user) {
          applyUserToForm(user);
          await setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error loading customer profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadCustomerProfile();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || currentUser.phoneNumber || '');
      setSecondaryPhone(currentUser.secondaryPhone || '');
      setGender(currentUser.gender || '');
      setHomeAddress({
        address: currentUser.homeAddress?.address || '',
        city: currentUser.homeAddress?.city || '',
        state: currentUser.homeAddress?.state || '',
        pincode: currentUser.homeAddress?.pincode || '',
      });
      setOfficeAddress({
        address: currentUser.officeAddress?.address || '',
        city: currentUser.officeAddress?.city || '',
        state: currentUser.officeAddress?.state || '',
        pincode: currentUser.officeAddress?.pincode || '',
      });
      const existingImage = currentUser.profileImage;
      if (existingImage && typeof existingImage === 'string' && existingImage.trim() !== '' && 
          (existingImage.startsWith('http://') || existingImage.startsWith('https://') || 
           existingImage.startsWith('file://') || existingImage.startsWith('content://'))) {
        setProfileImage(existingImage.trim());
      } else {
        setProfileImage(null);
      }
      setImageError(false);
    }
  }, [currentUser]);

  // Handle same as home address checkbox
  useEffect(() => {
    if (sameAsHomeAddress && isEditing) {
      setOfficeAddress({...homeAddress});
    }
  }, [sameAsHomeAddress, homeAddress, isEditing]);

  const handleSaveProfile = async () => {
    if (!(await getStoredJwt())) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('profile.mustBeLoggedInToUpdate'),
        type: 'error',
      });
      return;
    }

    if (!name.trim()) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('profile.pleaseEnterName'),
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const userId = currentUser?.id || currentUser?._id || '';
      const finalOfficeAddress = sameAsHomeAddress ? homeAddress : officeAddress;

      let imageUrl = currentUser?.profileImage || '';
      if (
        profileImage &&
        (profileImage.startsWith('file://') ||
          profileImage.startsWith('content://'))
      ) {
        // Profile image upload to cloud storage is not available without Firebase.
        // Keep previous remote URL if any.
        setAlertModal({
          visible: true,
          title: t('common.warning') || 'Warning',
          message:
            t('profile.failedToUploadImage') ||
            'Profile photo upload is unavailable. Other profile fields will still be saved.',
          type: 'warning',
        });
      } else if (
        profileImage &&
        (profileImage.startsWith('http://') ||
          profileImage.startsWith('https://'))
      ) {
        imageUrl = profileImage;
      }

      const updates: any = {
        name,
        gender,
        homeAddress:
          homeAddress.address || homeAddress.pincode ? homeAddress : null,
        officeAddress:
          finalOfficeAddress.address || finalOfficeAddress.pincode
            ? finalOfficeAddress
            : null,
        profileImage: imageUrl || null,
      };

      const updatedUser = await authService.updateUserProfile(userId, updates);
      await setCurrentUser(updatedUser);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setAlertModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to update profile',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logoutCustomer();
      await setCurrentUser(null);
      navigation.reset({
        index: 0,
        routes: [{name: 'Main'}],
      });
    } catch (error: any) {
      try {
        await setCurrentUser(null);
      } catch {
        // ignore
      }
      navigation.reset({
        index: 0,
        routes: [{name: 'Main'}],
      });
    }
  };

  if (profileLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {backgroundColor: theme.background},
        ]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.notLoggedInText, {color: theme.textSecondary, marginTop: 20}]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {backgroundColor: theme.background},
        ]}>
        <Icon name="person-circle-outline" size={80} color={theme.textSecondary} />
        <Text style={[styles.notLoggedInText, {color: theme.textSecondary}]}>
          {t('profile.pleaseLoginToView')}
        </Text>
        <TouchableOpacity
          style={[styles.button, {backgroundColor: theme.primary}]}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>{t('auth.login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayPhone =
    phone || currentUser?.phone || currentUser?.phoneNumber || '';
  const displayInitial = (
    name && name.trim() ? name.charAt(0) : displayPhone.charAt(0) || 'U'
  ).toUpperCase();

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.card,
            ...commonStyles.shadowSmall,
          },
        ]}>
        <TouchableOpacity
          onPress={isEditing ? pickImage : undefined}
          disabled={!isEditing || uploadingImage}
          activeOpacity={isEditing ? 0.7 : 1}>
          {(() => {
            const imageUrl = profileImage;
            const hasValidImage = imageUrl && !imageError && 
              (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || 
               imageUrl.startsWith('file://') || imageUrl.startsWith('content://'));
            
            if (hasValidImage) {
              return (
                <View style={styles.avatarContainer}>
                  <Image
                    source={{uri: imageUrl}}
                    style={[styles.avatarImage, styles.avatarContainer]}
                    onError={() => setImageError(true)}
                    resizeMode="cover"
                  />
                  {isEditing && (
                    <View style={styles.avatarOverlay}>
                      <Icon name="camera" size={24} color="#fff" />
                    </View>
                  )}
                  {uploadingImage && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>
              );
            }
            
            return (
              <View style={[styles.avatarContainer, {backgroundColor: theme.primary}]}>
                <Text style={styles.avatarText}>{displayInitial}</Text>
                {isEditing && (
                  <View style={styles.avatarOverlay}>
                    <Icon name="camera" size={24} color="#fff" />
                  </View>
                )}
                {uploadingImage && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>
            );
          })()}
        </TouchableOpacity>
        <Text style={[styles.userName, {color: theme.text}]}>
          {name || t('profile.user') || 'User'}
        </Text>
        <Text style={[styles.userEmail, {color: theme.primary}]}>
          {displayPhone || t('profile.notAvailable')}
        </Text>
      </View>

      {/* Profile Info */}
      <View
        style={[
          styles.section,
          {
            backgroundColor: theme.card,
            ...commonStyles.shadowSmall,
          },
        ]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {t('profile.personalInformation')}
          </Text>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            disabled={loading}>
            <Icon
              name={isEditing ? 'close' : 'create-outline'}
              size={24}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="person-outline" size={20} color={theme.primary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.fullName')}
            </Text>
          </View>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>{name}</Text>
          )}
        </View>

        {/* Primary Phone - Not editable if logged in with phone */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="call-outline" size={20} color={theme.primary} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={[styles.labelText, {color: theme.textSecondary}]}>
                {t('profile.primaryPhone')}
              </Text>
              {currentUser?.phoneVerified && (
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
          <View style={{flex: 1, alignItems: 'flex-end'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text style={[styles.infoValue, {color: phone ? theme.text : theme.textSecondary}]}>
                {phone || 'Not set'}
              </Text>
              {currentUser?.phoneVerified ? (
                <Icon name="lock-closed" size={16} color={theme.textSecondary} />
              ) : null}
            </View>
            {currentUser?.phoneVerified && (
              <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                {t('profile.verified')} ({t('profile.cannotBeChanged')})
              </Text>
            )}
            {!currentUser?.phoneVerified && phone && (
              <Text style={[styles.verifiedBadge, {color: theme.textSecondary}]}>
                Not Verified
              </Text>
            )}
          </View>
        </View>

        {/* Secondary Phone */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="call-outline" size={20} color={theme.primary} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={[styles.labelText, {color: theme.textSecondary}]}>
                {t('profile.secondaryPhone')}
              </Text>
              {currentUser?.secondaryPhoneVerified && (
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
          {isEditing ? (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {secondaryPhone ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <Text style={[styles.infoValue, {color: theme.text}]}>
                    {secondaryPhone}
                  </Text>
                  {currentUser?.secondaryPhoneVerified ? (
                    <Icon name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate('PhoneVerification', {
                          mode: 'secondary',
                          phoneNumber: secondaryPhone,
                        });
                      }}
                      style={{padding: 4}}>
                      <Text style={[styles.verifyLink, {color: theme.primary}]}>
                        {t('profile.verify')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setLoading(true);
                        // Remove secondary phone via API
                        try {
                          await authService.removeSecondaryPhone();
                        } catch (apiError) {
                          console.warn('Could not remove secondary phone via API:', apiError);
                        }
                        setSecondaryPhone('');
                        const updatedUser = await authService.getCurrentUser();
                        if (updatedUser) {
                        await setCurrentUser(updatedUser);
                      }
                      setSuccessMessage(t('profile.secondaryPhoneRemoved'));
                      setShowSuccessModal(true);
                    } catch (error: any) {
                      setAlertModal({
                        visible: true,
                        title: t('common.error'),
                        message: error.message,
                        type: 'error',
                      });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{padding: 4}}>
                    <Icon name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PhoneVerification', {
                      mode: 'secondary',
                    });
                  }}
                  style={[styles.addButton, {borderColor: theme.primary}]}>
                  <Icon name="add-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.addButtonText, {color: theme.primary}]}>
                    {t('profile.addSecondaryPhone') || '+ Add Secondary Phone'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {secondaryPhone ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <Text style={[styles.infoValue, {color: theme.text}]}>
                    {secondaryPhone}
                  </Text>
                  {currentUser?.secondaryPhoneVerified ? (
                    <>
                      <Icon name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                        {t('profile.verified')}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.verifiedBadge, {color: theme.textSecondary}]}>
                      {t('profile.notVerified')}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
                  {t('profile.notSet')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Gender */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="male-female-outline" size={20} color={theme.primary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.gender')}
            </Text>
          </View>
          {isEditing ? (
            <Select
              options={genderOptions.map(o => ({value: o, label: o}))}
              value={gender}
              onChange={setGender}
              placeholder={t('profile.selectGender')}
              title={t('profile.selectGender')}
              style={{flex: 1, marginBottom: 0}}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {gender || t('profile.notSet')}
            </Text>
          )}
        </View>

        {/* Home Address */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="home-outline" size={20} color={theme.primary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.homeAddress')}
            </Text>
          </View>
          {isEditing ? (
            <View style={{flex: 1}}>
              <TextInput
                style={[
                  styles.input,
                  styles.addressInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                value={homeAddress.address}
                onChangeText={(text) => setHomeAddress({...homeAddress, address: text})}
                placeholder={t('profile.streetAddress')}
                placeholderTextColor={theme.textSecondary}
                multiline
                editable={!loading}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    marginTop: 8,
                  },
                ]}
                value={homeAddress.pincode}
                onChangeText={(text) =>
                  setHomeAddress({...homeAddress, pincode: text})
                }
                placeholder={t('profile.pincode')}
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                maxLength={6}
                editable={!loading}
              />
            </View>
          ) : (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {formatAddress(homeAddress) ? (
                <Text style={[styles.infoValue, {color: theme.text, textAlign: 'right'}]}>
                  {formatAddress(homeAddress)}
                </Text>
              ) : (
                <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
                  {t('profile.notSet')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Office Address */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="business-outline" size={20} color={theme.primary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.officeAddress')}
            </Text>
          </View>
          {isEditing ? (
            <View style={{flex: 1}}>
              <View style={styles.checkboxRow}>
                <Switch
                  value={sameAsHomeAddress}
                  onValueChange={setSameAsHomeAddress}
                  trackColor={{false: theme.border, true: theme.primary}}
                  thumbColor="#FFFFFF"
                />
                <Text style={[styles.checkboxLabel, {color: theme.text}]}>
                  {t('profile.sameAsHomeAddress')}
                </Text>
              </View>
              {!sameAsHomeAddress && (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      styles.addressInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    value={officeAddress.address}
                    onChangeText={(text) =>
                      setOfficeAddress({...officeAddress, address: text})
                    }
                    placeholder={t('profile.streetAddress')}
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    editable={!loading}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        marginTop: 8,
                      },
                    ]}
                    value={officeAddress.pincode}
                    onChangeText={(text) =>
                      setOfficeAddress({...officeAddress, pincode: text})
                    }
                    placeholder={t('profile.pincode')}
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    maxLength={6}
                    editable={!loading}
                  />
                </>
              )}
            </View>
          ) : (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {formatAddress(officeAddress) ? (
                <Text style={[styles.infoValue, {color: theme.text, textAlign: 'right'}]}>
                  {formatAddress(officeAddress)}
                </Text>
              ) : (
                <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
                  {t('profile.notSet')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={[
              styles.button,
              {backgroundColor: theme.primary},
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSaveProfile}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('profile.saveChanges')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Account Actions */}
      <View
        style={[
          styles.section,
          {
            backgroundColor: theme.card,
            ...commonStyles.shadowSmall,
          },
        ]}>
        <Text style={[styles.sectionTitle, {color: theme.text, marginBottom: 15}]}>
          {t('profile.account')}
        </Text>

        <TouchableOpacity
          style={[
            styles.actionButton,
            {backgroundColor: theme.background, borderColor: theme.border},
          ]}
          onPress={handleLogout}>
          <Icon name="log-out-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionButtonText, {color: theme.primary}]}>
            {t('auth.logout')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <Text style={[styles.versionText, {color: theme.textSecondary}]}>
        Version 1.0.0
      </Text>
      
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

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
        title={t('common.success')}
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
  scrollContent: {
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoRow: {
    marginBottom: 20,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    marginLeft: 28,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    marginLeft: 0,
  },
  addressInput: {
    marginBottom: 8,
    minHeight: 72,
    height: undefined,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  addressInputHalf: {
    flex: 1,
    marginRight: 8,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 8,
    marginLeft: 0,
  },
  pickerContainer: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    marginLeft: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 28,
    marginBottom: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  button: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 0,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  notLoggedInText: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  verifiedBadge: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 28,
  },
  verifyLink: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
  },
});

export default ProfileScreen;
