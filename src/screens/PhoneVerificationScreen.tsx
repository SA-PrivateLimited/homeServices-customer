/**
 * Phone Verification Screen
 * Required for Google Sign-In users who haven't verified their phone
 * Blocks access to app until phone is verified
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import authService from '../services/authService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import CountryCodePicker from '../components/CountryCodePicker';
import {DEFAULT_COUNTRY_CODE, CountryCode} from '../utils/countryCodes';
import AlertModal from '../components/AlertModal';
import SuccessModal from '../components/SuccessModal';
import useTranslation from '../hooks/useTranslation';

interface PhoneVerificationScreenProps {
  navigation: any;
  route?: {
    params?: {
      mode?: 'secondary' | 'change' | 'initial';
      phoneNumber?: string;
    };
  };
}

export default function PhoneVerificationScreen({
  navigation,
  route,
}: PhoneVerificationScreenProps) {
  const mode = route?.params?.mode || 'initial';
  const initialPhoneNumber = route?.params?.phoneNumber || '';
  
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [retryAfter, setRetryAfter] = useState<number | null>(null); // Seconds until retry allowed

  const {isDarkMode, currentUser, setCurrentUser} = useStore();
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize phone number from route params
  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber);
    }
  }, [initialPhoneNumber]);

  // Countdown timer for retry
  useEffect(() => {
    if (retryAfter !== null && retryAfter > 0) {
      const timer = setTimeout(() => {
        setRetryAfter(retryAfter - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryAfter === 0) {
      setRetryAfter(null);
    }
  }, [retryAfter]);

  const handleSendPhoneCode = async () => {
    if (retryAfter !== null && retryAfter > 0) {
      const minutes = Math.floor(retryAfter / 60);
      const seconds = retryAfter % 60;
      setAlertModal({
        visible: true,
        title: 'Too Many Attempts',
        message: `Please wait ${minutes}:${seconds.toString().padStart(2, '0')} before trying again.`,
        type: 'warning',
      });
      return;
    }

    if (!phoneNumber.trim()) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please enter your phone number',
        type: 'error',
      });
      return;
    }

    // Validate phone number length (minimum 10 digits for India)
    const numericPhone = phoneNumber.replace(/\D/g, '');
    if (numericPhone.length < 10) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please enter a valid 10-digit phone number',
        type: 'error',
      });
      return;
    }

    // Combine country code with phone number (E.164 format)
    const fullPhoneNumber = selectedCountry.dialCode + numericPhone;

    setLoading(true);
    try {
      console.log('Attempting to send code to:', fullPhoneNumber);
      const result = await authService.sendPhoneVerificationCode(fullPhoneNumber);
      setConfirmResult(result);
      setStep('code');
      setRetryAfter(null); // Reset retry timer on success
      setAlertModal({
        visible: true,
        title: 'Success',
        message: 'Verification code sent to your phone',
        type: 'success',
      });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      // Handle rate limiting with retry timer
      if (error.message?.includes('Too many attempts') || error.message?.includes('too many verification attempts') || error.code === 'auth/too-many-requests') {
        // Set retry timer to 120 seconds (2 minutes) - shorter wait for better UX
        setRetryAfter(120);
        setAlertModal({
          visible: true,
          title: 'Verification Limit Reached',
          message: 'Too many verification attempts for this number. Please wait 2 minutes before trying again, or use a different phone number.',
          type: 'warning',
        });
      } else {
        setAlertModal({
          visible: true,
          title: 'Error',
          message: error.message || 'Failed to send verification code. Please try again.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!verificationCode.trim()) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please enter the verification code',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'secondary') {
        // Handle secondary phone verification
        const user = await authService.verifyPhoneCode(
          confirmResult,
          verificationCode,
          currentUser?.name || 'User',
          currentUser?.email,
        );

        // Save secondary phone to Firestore
        const authUser = auth().currentUser;
        if (authUser) {
          const fullPhoneNumber = selectedCountry.dialCode + phoneNumber.replace(/\D/g, '');
          await firestore()
            .collection('users')
            .doc(authUser.uid)
            .update({
              secondaryPhone: fullPhoneNumber,
              secondaryPhoneVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });

          await firestore()
            .collection('providers')
            .doc(authUser.uid)
            .update({
              secondaryPhone: fullPhoneNumber,
              secondaryPhoneVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });

          // Update current user
          const updatedUser = await authService.getCurrentUser();
          if (updatedUser) {
            await setCurrentUser(updatedUser);
          }
        }

        setSuccessMessage('Secondary phone number verified successfully!');
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }, 2000);
      } else {
        // Handle primary phone verification
        const user = await authService.verifyPhoneCode(
          confirmResult,
          verificationCode,
          currentUser?.name || 'User',
          currentUser?.email,
        );

        // Update current user with verified phone
        const updatedUser = {
          ...user,
          phoneVerified: true,
          role: currentUser?.role || user.role,
        };

        setCurrentUser(updatedUser);

        setAlertModal({
          visible: true,
          title: t('common.success'),
          message: t('phoneVerification.phoneVerifiedSuccess') || 'Phone number verified successfully!',
          type: 'success',
        });
        
        // Navigate after a short delay
        setTimeout(() => {
          setAlertModal({visible: false, title: '', message: '', type: 'info'});
          if (mode === 'initial') {
            navigation.reset({
              index: 0,
              routes: [{name: 'Main'}],
            });
          } else {
            navigation.goBack();
          }
        }, 2000);
      }
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to verify code',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setStep('phone');
    setVerificationCode('');
    setConfirmResult(null);
  };

  // Get title and subtitle based on mode
  const getTitle = () => {
    if (mode === 'secondary') {
      return 'Add Secondary Phone Number';
    } else if (mode === 'change') {
      return 'Update Phone Number';
    }
    return 'Verify Your Phone Number';
  };

  const getSubtitle = () => {
    if (mode === 'secondary') {
      return 'Add a secondary phone number to your account. This will help us reach you if your primary number is unavailable.';
    } else if (mode === 'change') {
      return 'Update your phone number to keep your account secure and receive important notifications.';
    }
    return 'Phone verification is required to use HomeServices. This helps us ensure account security and enable important features like service requests and notifications.';
  };

  // Check if back button should be shown (not for initial verification)
  const showBackButton = mode !== 'initial';

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header with back button */}
      {showBackButton && (
        <View style={[styles.header, {backgroundColor: theme.card, borderBottomColor: theme.border}]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: theme.text}]}>
            {getTitle()}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="phone-portrait" size={64} color={theme.primary} />
        </View>

        <Text style={[styles.title, {color: theme.text}]}>
          {getTitle()}
        </Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {getSubtitle()}
        </Text>

        {step === 'phone' ? (
          <>
            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCodeWrapper}>
                <CountryCodePicker
                  selectedCountry={selectedCountry}
                  onSelect={setSelectedCountry}
                />
              </View>
              <View style={styles.phoneInputWrapper}>
                <TextInput
                  style={[
                    styles.phoneInput,
                    {
                      backgroundColor: theme.card,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    // Remove non-numeric characters
                    const numericText = text.replace(/\D/g, '');
                    setPhoneNumber(numericText);
                  }}
                  placeholder="Enter 10-digit phone number"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  autoFocus={!initialPhoneNumber}
                  maxLength={10}
                />
              </View>
            </View>
            
            {mode === 'secondary' && (
              <Text style={[styles.infoText, {color: theme.textSecondary, marginTop: -8, marginBottom: 16}]}>
                This number will be used as a backup contact method.
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    phoneNumber.trim() && !loading && retryAfter === null
                      ? theme.primary
                      : theme.border,
                  opacity: phoneNumber.trim() && !loading && retryAfter === null ? 1 : 0.5,
                },
              ]}
              onPress={handleSendPhoneCode}
              disabled={!phoneNumber.trim() || loading || (retryAfter !== null && retryAfter > 0)}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : retryAfter !== null && retryAfter > 0 ? (
                <Text style={styles.buttonText}>
                  Retry in {Math.floor(retryAfter / 60)}:{(retryAfter % 60).toString().padStart(2, '0')}
                </Text>
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Icon
                name="keypad-outline"
                size={20}
                color={theme.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    verificationCode.trim().length === 6 && !loading
                      ? theme.primary
                      : theme.border,
                  opacity:
                    verificationCode.trim().length === 6 && !loading ? 1 : 0.5,
                },
              ]}
              onPress={handleVerifyPhoneCode}
              disabled={verificationCode.trim().length !== 6 || loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={loading}>
              <Text style={[styles.resendText, {color: theme.primary}]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.infoText, {color: theme.textSecondary}]}>
          {step === 'phone' 
            ? 'By continuing, you agree to receive SMS messages for verification purposes. Standard message rates may apply.'
            : 'Enter the 6-digit verification code sent to your phone number. The code will expire in 10 minutes.'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    height: 56,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 32, // Compensate for back button width
  },
  headerSpacer: {
    width: 32, // Same width as back button to center title
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  countryCodeWrapper: {
    width: 120,
  },
  phoneInputWrapper: {
    flex: 1,
  },
  phoneInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 16,
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
});

