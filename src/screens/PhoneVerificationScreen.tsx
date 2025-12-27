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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import authService from '../services/authService';
import auth from '@react-native-firebase/auth';
import CountryCodePicker from '../components/CountryCodePicker';
import {DEFAULT_COUNTRY_CODE, CountryCode} from '../utils/countryCodes';

interface PhoneVerificationScreenProps {
  navigation: any;
}

export default function PhoneVerificationScreen({
  navigation,
}: PhoneVerificationScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [retryAfter, setRetryAfter] = useState<number | null>(null); // Seconds until retry allowed

  const {isDarkMode, currentUser, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

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
      Alert.alert(
        'Too Many Attempts',
        `Please wait ${minutes}:${seconds.toString().padStart(2, '0')} before trying again.`,
      );
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Validate phone number length (minimum 10 digits for India)
    const numericPhone = phoneNumber.replace(/\D/g, '');
    if (numericPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
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
      Alert.alert('Success', 'Verification code sent to your phone');
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      // Handle rate limiting with retry timer
      if (error.message?.includes('Too many attempts') || error.message?.includes('too many verification attempts') || error.code === 'auth/too-many-requests') {
        // Set retry timer to 120 seconds (2 minutes) - shorter wait for better UX
        setRetryAfter(120);
        Alert.alert(
          'Verification Limit Reached',
          'Too many verification attempts for this number. Please wait 2 minutes before trying again, or use a different phone number.',
          [{text: 'OK'}],
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
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

      Alert.alert(
        'Success',
        'Phone number verified successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to main app
              navigation.reset({
                index: 0,
                routes: [{name: 'Main'}],
              });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setStep('phone');
    setVerificationCode('');
    setConfirmResult(null);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="phone-portrait" size={64} color={theme.primary} />
        </View>

        <Text style={[styles.title, {color: theme.text}]}>
          Verify Your Phone Number
        </Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          Phone verification is required to use HomeServices. This helps us
          ensure account security and enable important features.
        </Text>

        {step === 'phone' ? (
          <>
            <View style={styles.phoneInputContainer}>
              <CountryCodePicker
                selectedCountry={selectedCountry}
                onSelect={setSelectedCountry}
              />
              <View style={[styles.inputContainer, {flex: 1}]}>
                <TextInput
                  style={[
                    styles.input,
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
                  placeholder="9876543210"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  autoFocus
                />
              </View>
            </View>

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
          By continuing, you agree to receive SMS messages for verification
          purposes.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'center',
    marginBottom: 16,
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

