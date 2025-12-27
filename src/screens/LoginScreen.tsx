import React, {useState} from 'react';
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
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
import CountryCodePicker from '../components/CountryCodePicker';
import {DEFAULT_COUNTRY_CODE, CountryCode} from '../utils/countryCodes';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);

  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleSendPhoneCode = async () => {
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
      Alert.alert('Success', 'Verification code sent to your phone');
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.');
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
      Alert.alert('Error', error.message || 'Failed to verify code');
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
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
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
            Login to book home services
          </Text>
        </View>

        {/* Phone Login Form */}
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
                      styles.inputContainer,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        flex: 1,
                      },
                    ]}>
                    <TextInput
                      style={[styles.input, {color: theme.text}]}
                      placeholder="9876543210"
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
                    <Text style={styles.buttonText}>Send Code</Text>
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
                    placeholder="Verification Code"
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
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendPhoneCode}
                  disabled={loading}>
                  <Text style={[styles.resendText, {color: theme.primary}]}>
                    Resend Code
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
            <Text style={[styles.dividerText, {color: theme.textSecondary}]}>
              OR
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
              Continue with Google
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
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
});

export default LoginScreen;
