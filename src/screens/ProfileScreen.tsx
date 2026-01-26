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
  Modal,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import {launchImageLibrary} from 'react-native-image-picker';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
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
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(currentUser?.secondaryPhone || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  const [bloodGroup, setBloodGroup] = useState(currentUser?.bloodGroup || '');
  
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
  const [sendingEmailVerification, setSendingEmailVerification] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
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

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets[0].uri) {
        setProfileImage(response.assets[0].uri);
        setImageError(false);
      }
    });
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const filename = `users/${auth().currentUser?.uid || 'profile'}/${Date.now()}.jpg`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  // Load customer profile from API if not in store
  useEffect(() => {
    const loadCustomerProfile = async () => {
      const authUser = auth().currentUser;
      if (!authUser) {
        setProfileLoading(false);
        return;
      }

      // If currentUser is already loaded, use it
      if (currentUser && currentUser.id === authUser.uid) {
        setName(currentUser.name || '');
        setEmail(currentUser.email || authUser.email || '');
        setPhone(currentUser.phone || authUser.phoneNumber || '');
        setSecondaryPhone(currentUser.secondaryPhone || '');
        setGender(currentUser.gender || '');
        setBloodGroup(currentUser.bloodGroup || '');
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
        setSameAsHomeAddress(
          !!(currentUser.homeAddress?.address && 
          currentUser.officeAddress?.address &&
          currentUser.homeAddress.address === currentUser.officeAddress.address)
        );
        const existingImage = currentUser.profileImage;
        if (existingImage && typeof existingImage === 'string' && existingImage.trim() !== '' && 
            (existingImage.startsWith('http://') || existingImage.startsWith('https://') || 
             existingImage.startsWith('file://') || existingImage.startsWith('content://'))) {
          setProfileImage(existingImage.trim());
        } else {
          setProfileImage(null);
        }
        setImageError(false);
        setProfileLoading(false);
        return;
      }

      // Otherwise, fetch from API via authService
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setName(user.name || authUser.displayName || '');
          setEmail(user.email || authUser.email || '');
          setPhone(user.phone || authUser.phoneNumber || '');
          setSecondaryPhone((user as any).secondaryPhone || '');
          setGender((user as any).gender || '');
          setBloodGroup((user as any).bloodGroup || '');
          setHomeAddress({
            address: (user as any).homeAddress?.address || '',
            city: (user as any).homeAddress?.city || '',
            state: (user as any).homeAddress?.state || '',
            pincode: (user as any).homeAddress?.pincode || '',
          });
          setOfficeAddress({
            address: (user as any).officeAddress?.address || '',
            city: (user as any).officeAddress?.city || '',
            state: (user as any).officeAddress?.state || '',
            pincode: (user as any).officeAddress?.pincode || '',
          });
          setSameAsHomeAddress(
            !!((user as any).homeAddress?.address && 
            (user as any).officeAddress?.address &&
            (user as any).homeAddress.address === (user as any).officeAddress.address)
          );
          
          const existingImage = (user as any).profileImage;
          if (existingImage && typeof existingImage === 'string' && existingImage.trim() !== '' && 
              (existingImage.startsWith('http://') || existingImage.startsWith('https://') || 
               existingImage.startsWith('file://') || existingImage.startsWith('content://'))) {
            setProfileImage(existingImage.trim());
          } else {
            setProfileImage(null);
          }
          setImageError(false);
          
          // Update store with fetched user
          await setCurrentUser(user);
        } else {
          // User document doesn't exist, use auth user data
          setName(authUser.displayName || '');
          setEmail(authUser.email || '');
          setPhone(authUser.phoneNumber || '');
        }
      } catch (error) {
        console.error('Error loading customer profile:', error);
        // Fallback to auth user data
        setName(authUser.displayName || '');
        setEmail(authUser.email || '');
        setPhone(authUser.phoneNumber || '');
      } finally {
        setProfileLoading(false);
      }
    };

    loadCustomerProfile();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setSecondaryPhone(currentUser.secondaryPhone || '');
      setGender(currentUser.gender || '');
      setBloodGroup(currentUser.bloodGroup || '');
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

  const handleSendEmailVerification = async () => {
    const authUser = auth().currentUser;
    if (!authUser) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('profile.mustBeLoggedIn'),
        type: 'error',
      });
      return;
    }

    if (!email.trim()) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('profile.pleaseEnterEmail'),
        type: 'error',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('profile.pleaseEnterValidEmail'),
        type: 'error',
      });
      return;
    }

    setSendingEmailVerification(true);
    try {
      const emailToVerify = email.trim();
      const currentEmail = authUser.email;
      
      // Check if user is authenticated with email/password (email verification only works for email/password users)
      const providerData = authUser.providerData || [];
      const hasEmailPassword = providerData.some((provider: any) => provider.providerId === 'password');
      const isPhoneAuth = providerData.some((provider: any) => provider.providerId === 'phone');
      
      // For phone-authenticated users, we can't use sendEmailVerification()
      if (isPhoneAuth && !hasEmailPassword) {
        // Update email via API (can't verify via Firebase Auth)
        if (currentEmail && emailToVerify !== currentEmail) {
          try {
            await authService.updateUserProfile(authUser.uid, {
              email: emailToVerify,
              emailVerified: false,
            } as any);
          } catch (error) {
            console.warn('Could not update email:', error);
          }
        }
        setAlertModal({
          visible: true,
          title: t('profile.emailUpdated'),
          message: t('profile.emailUpdatedMessage'),
          type: 'info',
        });
        setSendingEmailVerification(false);
        return;
      }
      
      // Only update email if it's different from current email (for email/password users)
      if (currentEmail && emailToVerify !== currentEmail) {
        try {
          await authUser.updateEmail(emailToVerify);
          // Update email via API after successful update
          try {
            await authService.updateUserProfile(authUser.uid, {
              email: emailToVerify,
              emailVerified: false,
            } as any);
          } catch (apiError) {
            console.warn('Could not update email in API:', apiError);
          }
        } catch (updateError: any) {
          if (updateError.code === 'auth/requires-recent-login') {
            setAlertModal({
              visible: true,
              title: t('profile.reauthRequired'),
              message: t('profile.reauthRequiredMessage'),
              type: 'error',
            });
            setSendingEmailVerification(false);
            return;
          } else if (updateError.code === 'auth/email-already-in-use') {
            setAlertModal({
              visible: true,
              title: t('common.error'),
              message: t('profile.emailAlreadyInUse'),
              type: 'error',
            });
            setSendingEmailVerification(false);
            return;
          } else if (updateError.code === 'auth/operation-not-allowed') {
            setAlertModal({
              visible: true,
              title: t('profile.operationNotAllowed'),
              message: t('profile.operationNotAllowedMessage'),
              type: 'error',
            });
            setSendingEmailVerification(false);
            return;
          }
          throw updateError;
        }
      }
      
      // Reload user to get latest email
      await authUser.reload();
      
      // Send verification email (only works for email/password users)
      try {
        await authUser.sendEmailVerification();
      } catch (verifyError: any) {
        // If operation-not-allowed, it means email verification is disabled or not available
        if (verifyError.code === 'auth/operation-not-allowed') {
          setAlertModal({
            visible: true,
            title: t('profile.emailVerificationUnavailable'),
            message: t('profile.emailVerificationUnavailableMessage'),
            type: 'error',
          });
          setSendingEmailVerification(false);
          return;
        }
        throw verifyError;
      }

      setAlertModal({
        visible: true,
        title: t('profile.verificationEmailSent'),
        message: t('profile.verificationEmailSentMessage'),
        type: 'success',
      });
    } catch (error: any) {
      console.error('Error sending email verification:', error);
      let errorMessage = 'Failed to send verification email. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use by another account';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please logout and login again to change your email';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email verification is currently disabled. Please enable Email/Password provider in Firebase Console > Authentication > Sign-in method.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setAlertModal({
        visible: true,
        title: 'Error',
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setSendingEmailVerification(false);
    }
  };

  const handleSaveProfile = async () => {
    const authUser = auth().currentUser;
    if (!authUser) {
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

    // Validate email format
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setAlertModal({
          visible: true,
          title: 'Error',
          message: 'Please enter a valid email address',
          type: 'error',
        });
        return;
      }
    }

    setLoading(true);
    try {
      const userId = currentUser?.id || authUser.uid;
      
      // Prepare office address - if same as home, use home address
      const finalOfficeAddress = sameAsHomeAddress ? homeAddress : officeAddress;
      
      // Upload profile image if it's a local file
      let imageUrl = currentUser?.profileImage || '';
      if (profileImage && (profileImage.startsWith('file://') || profileImage.startsWith('content://'))) {
        try {
          setUploadingImage(true);
          imageUrl = await uploadImage(profileImage);
        } catch (uploadError: any) {
          console.error('Error uploading profile image:', uploadError);
          setAlertModal({
            visible: true,
            title: t('common.warning'),
            message: t('profile.failedToUploadImage'),
            type: 'warning',
          });
          // Continue without image update
        } finally {
          setUploadingImage(false);
        }
      } else if (profileImage && (profileImage.startsWith('http://') || profileImage.startsWith('https://'))) {
        // If it's already a URL, use it as is
        imageUrl = profileImage;
      }
      
      const updates: any = {
        name,
        email: email.trim() || authUser.email || '',
        gender,
        bloodGroup,
        homeAddress: homeAddress.address ? homeAddress : null,
        officeAddress: finalOfficeAddress.address ? finalOfficeAddress : null,
        profileImage: imageUrl || null,
        // updatedAt will be set by API
      };

      // Update email in Firebase Auth if changed
      if (email.trim() && email.trim() !== authUser.email) {
        try {
          await authUser.updateEmail(email.trim());
          updates.emailVerified = false; // Reset verification status
        } catch (error: any) {
          if (error.code === 'auth/requires-recent-login') {
            setAlertModal({
              visible: true,
              title: t('profile.emailUpdateRequiresReauth') || 'Email Update Requires Re-authentication',
              message: t('profile.emailUpdateRequiresReauthMessage') || 'Please logout and login again to change your email address.',
              type: 'warning',
            });
            return;
          }
          throw error;
        }
      }

      // Check email verification status from Firebase Auth
      await authUser.reload();
      updates.emailVerified = authUser.emailVerified;

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
      await authService.logout();
      await setCurrentUser(null);
      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message,
        type: 'error',
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

  const authUser = auth().currentUser;
  if (!authUser && !currentUser) {
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

  const isEmailVerified = authUser?.emailVerified || currentUser?.emailVerified || false;

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
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
                <Text style={styles.avatarText}>
                  {name && name.trim() ? name.charAt(0).toUpperCase() : ((authUser?.displayName || authUser?.email || 'U').charAt(0).toUpperCase())}
                </Text>
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
          {name || authUser?.displayName || authUser?.email || 'User'}
        </Text>
        <Text style={[styles.userEmail, {color: theme.textSecondary}]}>
          {email || authUser?.email || t('profile.notAvailable')}
        </Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
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
            <Icon name="person-outline" size={20} color={theme.textSecondary} />
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

        {/* Email */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="mail-outline" size={20} color={theme.textSecondary} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={[styles.labelText, {color: theme.textSecondary}]}>
                {t('profile.email')}
              </Text>
              {isEmailVerified && (
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
          {isEditing ? (
            <View style={{flex: 1}}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              {!isEmailVerified && (
                <TouchableOpacity
                  onPress={handleSendEmailVerification}
                  disabled={sendingEmailVerification || loading}
                  style={styles.verifyEmailButton}>
                  {sendingEmailVerification ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <Icon name="mail-outline" size={16} color={theme.primary} />
                      <Text style={[styles.verifyEmailText, {color: theme.primary}]}>
                        {t('profile.verifyEmail')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {isEmailVerified && (
                <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                  {t('profile.verified')}
                </Text>
              )}
            </View>
          ) : (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Text style={[styles.infoValue, {color: email ? theme.text : theme.textSecondary}]}>
                  {email || 'Not set'}
                </Text>
                {isEmailVerified && (
                  <Icon name="checkmark-circle" size={16} color="#4CAF50" />
                )}
              </View>
              {isEmailVerified ? (
                <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                  {t('profile.verified')}
                </Text>
              ) : (
                <Text style={[styles.verifiedBadge, {color: theme.textSecondary}]}>
                  {t('profile.notVerified')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Primary Phone - Not editable if logged in with phone */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="call-outline" size={20} color={theme.textSecondary} />
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
              {(() => {
                const currentAuthUser = auth().currentUser;
                const loggedInWithPhone = currentAuthUser?.phoneNumber && currentUser?.phoneVerified;
                if (loggedInWithPhone) {
                  return <Icon name="lock-closed" size={16} color={theme.textSecondary} />;
                }
                return null;
              })()}
            </View>
            {currentUser?.phoneVerified && (
              <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                {t('profile.verified')} {(() => {
                  const currentAuthUser = auth().currentUser;
                  const loggedInWithPhone = currentAuthUser?.phoneNumber && currentUser?.phoneVerified;
                  return loggedInWithPhone ? `(${t('profile.cannotBeChanged')})` : '';
                })()}
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
            <Icon name="call-outline" size={20} color={theme.textSecondary} />
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
                    Add Secondary Phone
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
            <Icon name="male-female-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              Gender
            </Text>
          </View>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[
                  styles.pickerContainer,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowGenderPicker(true)}>
                <Text style={[styles.pickerText, {color: gender ? theme.text : theme.textSecondary}]}>
                  {gender || t('profile.selectGender')}
                </Text>
                <Icon name="chevron-down" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
              
              <Modal
                visible={showGenderPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowGenderPicker(false)}>
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowGenderPicker(false)}>
                  <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
                    <View style={[styles.modalHeader, {borderBottomColor: theme.border}]}>
                      <Text style={[styles.modalTitle, {color: theme.text}]}>
                        {t('profile.selectGender')}
                      </Text>
                      <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                        <Icon name="close" size={24} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                    {genderOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.modalOption,
                          {
                            backgroundColor:
                              gender === option ? theme.primary + '20' : 'transparent',
                          },
                        ]}
                        onPress={() => {
                          setGender(option);
                          setShowGenderPicker(false);
                        }}>
                        <Text
                          style={[
                            styles.modalOptionText,
                            {
                              color: gender === option ? theme.primary : theme.text,
                              fontWeight: gender === option ? '600' : '400',
                            },
                          ]}>
                          {option}
                        </Text>
                        {gender === option && (
                          <Icon name="checkmark" size={20} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
            </>
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {gender || t('profile.notSet')}
            </Text>
          )}
        </View>

        {/* Blood Group */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="water-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.bloodGroup')}
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
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder={t('profile.bloodGroupPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {bloodGroup || t('profile.notSet')}
            </Text>
          )}
        </View>

        {/* Home Address */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="home-outline" size={20} color={theme.textSecondary} />
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
                editable={!loading}
              />
              <View style={styles.addressRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.addressInputHalf,
                    {
                      color: theme.text,
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  value={homeAddress.city}
                  onChangeText={(text) => setHomeAddress({...homeAddress, city: text})}
                  placeholder={t('profile.city')}
                  placeholderTextColor={theme.textSecondary}
                  editable={!loading}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.addressInputHalf,
                    {
                      color: theme.text,
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  value={homeAddress.state}
                  onChangeText={(text) => setHomeAddress({...homeAddress, state: text})}
                  placeholder={t('profile.state')}
                  placeholderTextColor={theme.textSecondary}
                  editable={!loading}
                />
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                value={homeAddress.pincode}
                onChangeText={(text) => setHomeAddress({...homeAddress, pincode: text})}
                placeholder={t('profile.pincode')}
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          ) : (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {homeAddress.address ? (
                <Text style={[styles.infoValue, {color: theme.text, textAlign: 'right'}]}>
                  {homeAddress.address}
                  {homeAddress.city && `, ${homeAddress.city}`}
                  {homeAddress.state && `, ${homeAddress.state}`}
                  {homeAddress.pincode && ` - ${homeAddress.pincode}`}
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
            <Icon name="business-outline" size={20} color={theme.textSecondary} />
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
                    onChangeText={(text) => setOfficeAddress({...officeAddress, address: text})}
                    placeholder={t('profile.streetAddress')}
                    placeholderTextColor={theme.textSecondary}
                    editable={!loading}
                  />
                  <View style={styles.addressRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.addressInputHalf,
                        {
                          color: theme.text,
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                      value={officeAddress.city}
                      onChangeText={(text) => setOfficeAddress({...officeAddress, city: text})}
                      placeholder={t('profile.city')}
                      placeholderTextColor={theme.textSecondary}
                      editable={!loading}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.addressInputHalf,
                        {
                          color: theme.text,
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                      value={officeAddress.state}
                      onChangeText={(text) => setOfficeAddress({...officeAddress, state: text})}
                      placeholder={t('profile.state')}
                      placeholderTextColor={theme.textSecondary}
                      editable={!loading}
                    />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    value={officeAddress.pincode}
                    onChangeText={(text) => setOfficeAddress({...officeAddress, pincode: text})}
                    placeholder={t('profile.pincode')}
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </>
              )}
            </View>
          ) : (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {officeAddress.address ? (
                <Text style={[styles.infoValue, {color: theme.text, textAlign: 'right'}]}>
                  {officeAddress.address}
                  {officeAddress.city && `, ${officeAddress.city}`}
                  {officeAddress.state && `, ${officeAddress.state}`}
                  {officeAddress.pincode && ` - ${officeAddress.pincode}`}
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
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          {t('profile.account')}
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={handleLogout}>
          <Icon name="log-out-outline" size={20} color="#ff4444" />
          <Text style={[styles.actionButtonText, {color: '#ff4444'}]}>
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
    marginBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
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
    marginBottom: 30,
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
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginLeft: 28,
  },
  addressInput: {
    marginBottom: 8,
  },
  addressInputHalf: {
    flex: 1,
    marginRight: 8,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 8,
    marginLeft: 28,
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
    marginBottom: 10,
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
  verifyEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 28,
    paddingVertical: 4,
  },
  verifyEmailText: {
    fontSize: 14,
    marginLeft: 4,
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
