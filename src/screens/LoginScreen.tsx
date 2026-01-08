import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
import CountryCodePicker from '../components/CountryCodePicker';
import {DEFAULT_COUNTRY_CODE, CountryCode} from '../utils/countryCodes';
import AlertModal from '../components/AlertModal';
import useTranslation from '../hooks/useTranslation';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  
  // Email OTP state
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [emailOTPCode, setEmailOTPCode] = useState('');
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [emailOTPExpiresAt, setEmailOTPExpiresAt] = useState<number | null>(null);

  const {isDarkMode, setCurrentUser} = useStore();
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

  const handleSendPhoneCode = async () => {
    if (!phoneNumber.trim()) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('auth.pleaseEnterPhone'),
        type: 'error',
      });
      return;
    }

    // Validate phone number length (minimum 10 digits for India)
    const numericPhone = phoneNumber.replace(/\D/g, '');
    if (numericPhone.length < 10) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('auth.pleaseEnterValidPhone'),
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
      setAlertModal({
        visible: true,
        title: t('common.success'),
        message: t('auth.codeSentToPhone'),
        type: 'success',
      });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('auth.failedToSendCode'),
        type: 'error',
      });
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

    if (!confirmResult) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please request a verification code first',
        type: 'error',
      });
      return;
    }

    // Clean the code - remove spaces and dashes
    const cleanCode = verificationCode.trim().replace(/[\s\-]/g, '');

    setLoading(true);
    try {
      console.log('Verifying code:', cleanCode.length, 'digits');
      const user = await authService.verifyPhoneCode(
        confirmResult,
        cleanCode,
        'Customer', // Default name for phone login
      );

      // Set role as 'customer' for HomeServices app
      const userWithRole = {
        ...user,
        role: 'customer' as const,
      };

      // Update user role in Firestore if needed
      if (user.role !== 'customer') {
        try {
          await authService.updateUserRole(user.id, 'customer');
          userWithRole.role = 'customer';
        } catch (error) {
          // Role update failed, but continue with login
          console.warn('Failed to update user role:', error);
        }
      }

      setCurrentUser(userWithRole);
      navigation.reset({
        index: 0,
        routes: [{name: 'Main'}],
      });
    } catch (error: any) {
      console.error('Phone verification failed:', error);
      const errorMessage = error.message || 'Failed to verify code. Please try again.';
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: errorMessage,
        type: 'error',
      });
      
      // If session expired, reset confirmation
      if (error.message?.includes('expired') || error.message?.includes('session')) {
        setConfirmResult(null);
        setVerificationCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOTP = async () => {
    if (!email.trim()) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please enter your email address',
        type: 'error',
      });
      return;
    }

    // Validate email format
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

    setLoading(true);
    try {
      const result = await authService.sendEmailOTP(email.trim());
      setEmailOTPSent(true);
      setEmailOTPExpiresAt(result.expiresAt);
      setAlertModal({
        visible: true,
        title: t('common.success'),
        message: t('auth.codeSentToEmail'),
        type: 'success',
      });
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('auth.failedToSendEmailCode'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (!emailOTPCode.trim()) {
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
      const user = await authService.verifyEmailOTP(
        email.trim(),
        emailOTPCode.trim(),
        'Customer',
      );

      // Set role as 'customer' for HomeServices app
      const userWithRole = {
        ...user,
        role: 'customer' as const,
      };

      // Update user role in Firestore if needed
      if (user.role !== 'customer') {
        try {
          await authService.updateUserRole(user.id, 'customer');
          userWithRole.role = 'customer';
        } catch (error) {
          console.warn('Failed to update user role:', error);
        }
      }

      setCurrentUser(userWithRole);
      
      // Check if phone is verified
      if (userWithRole.phoneVerified !== true) {
        navigation.reset({
          index: 0,
          routes: [{name: 'PhoneVerification'}],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{name: 'Main'}],
        });
      }
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('auth.failedToVerifyCode'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const user = await authService.signInWithGoogle();

      // Set role as 'customer' for HomeServices app
      const userWithRole = {
        ...user,
        role: 'customer' as const,
      };

      // Update user role in Firestore if needed
      if (user.role !== 'customer') {
        try {
          await authService.updateUserRole(user.id, 'customer');
          userWithRole.role = 'customer';
        } catch (error) {
          // Role update failed, but continue with login
          console.warn('Failed to update user role:', error);
        }
      }

      setCurrentUser(userWithRole);
      
      // Check if phone is verified
      if (userWithRole.phoneVerified !== true) {
        navigation.reset({
          index: 0,
          routes: [{name: 'PhoneVerification'}],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{name: 'Main'}],
        });
      }
    } catch (error: any) {
      if (error.message?.includes('cancelled')) {
        // User cancelled, don't show error
        return;
      }
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('auth.failedToSignInWithGoogle'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Icon name="home" size={60} color={theme.primary} />
          <Text style={[styles.title, {color: theme.text}]}>HomeServices</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            {t('auth.loginToBookServices')}
          </Text>
        </View>

        {/* Login Method Toggle */}
        <View style={styles.methodToggleContainer}>
          <TouchableOpacity
            style={[
              styles.methodToggle,
              loginMethod === 'phone' && {backgroundColor: theme.primary},
              loginMethod === 'email' && {backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border},
            ]}
            onPress={() => {
              setLoginMethod('phone');
              setEmailOTPSent(false);
              setConfirmResult(null);
            }}>
            <Icon 
              name="call-outline" 
              size={18} 
              color={loginMethod === 'phone' ? '#fff' : theme.textSecondary} 
            />
            <Text
              style={[
                styles.methodToggleText,
                {color: loginMethod === 'phone' ? '#fff' : theme.textSecondary},
              ]}>
              {t('auth.phone')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodToggle,
              loginMethod === 'email' && {backgroundColor: theme.primary},
              loginMethod === 'phone' && {backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border},
            ]}
            onPress={() => {
              setLoginMethod('email');
              setEmailOTPSent(false);
              setConfirmResult(null);
            }}>
            <Icon 
              name="mail-outline" 
              size={18} 
              color={loginMethod === 'email' ? '#fff' : theme.textSecondary} 
            />
            <Text
              style={[
                styles.methodToggleText,
                {color: loginMethod === 'email' ? '#fff' : theme.textSecondary},
              ]}>
              {t('auth.email')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phone Login Form */}
        {loginMethod === 'phone' && (
          <View style={styles.form}>
            {!confirmResult ? (
              <>
                <View style={styles.phoneInputRow}>
                  <CountryCodePicker
                    selectedCountry={selectedCountry}
                    onSelect={setSelectedCountry}
                  />
                  <View
                    style={[
                      styles.phoneInputContainer,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        flex: 1,
                      },
                    ]}>
                    <TextInput
                      style={[styles.phoneInput, {color: theme.text}]}
                      placeholder={t('auth.phonePlaceholder')}
                      placeholderTextColor={theme.textSecondary}
                      value={phoneNumber}
                      onChangeText={(text) => {
                        // Remove non-numeric characters
                        const numericText = text.replace(/\D/g, '');
                        setPhoneNumber(numericText);
                      }}
                      keyboardType="phone-pad"
                      editable={!loading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {backgroundColor: theme.primary},
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleSendPhoneCode}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t('auth.sendCode')}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  <Icon
                    name="keypad-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, {color: theme.text}]}
                    placeholder={t('auth.verificationCode')}
                    placeholderTextColor={theme.textSecondary}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {backgroundColor: theme.primary},
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyPhoneCode}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t('auth.verifyCode')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendPhoneCode}
                  disabled={loading}>
                  <Text style={[styles.resendText, {color: theme.primary}]}>
                    {t('auth.resendCode')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Email Login Form */}
        {loginMethod === 'email' && (
          <View style={styles.form}>
            {!emailOTPSent ? (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  <Icon
                    name="mail-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, {color: theme.text}]}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {backgroundColor: theme.primary},
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleSendEmailOTP}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t('auth.sendCode')}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  <Icon
                    name="keypad-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, {color: theme.text}]}
                    placeholder={t('auth.verificationCode')}
                    placeholderTextColor={theme.textSecondary}
                    value={emailOTPCode}
                    onChangeText={setEmailOTPCode}
                    keyboardType="number-pad"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {backgroundColor: theme.primary},
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyEmailOTP}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t('auth.verifyCode')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendEmailOTP}
                  disabled={loading}>
                  <Text style={[styles.resendText, {color: theme.primary}]}>
                    {t('auth.resendCode')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
            <Text style={[styles.dividerText, {color: theme.textSecondary}]}>
              {t('auth.or')}
            </Text>
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
          </View>

        {/* Google Sign-In */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {backgroundColor: theme.card, borderColor: theme.border},
              loading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}>
            <Icon name="logo-google" size={20} color="#DB4437" />
            <Text style={[styles.googleButtonText, {color: theme.text}]}>
              {t('auth.continueWithGoogle')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({...alertModal, visible: false})}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'flex-start',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    height: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    paddingVertical: 0,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  googleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  methodToggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  methodToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  methodToggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;
