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
import {lightTheme, darkTheme} from '../utils/theme';
import authService from '../services/authService';
import AccountCreatedSuccessModal from '../components/AccountCreatedSuccessModal';

interface SignUpScreenProps {
  navigation: any;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({navigation}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<{name?: string; email?: string} | null>(null);

  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSignUp = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!phone.trim() || !validatePhone(phone)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    if (!password.trim() || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.signUpWithEmail(
        email,
        password,
        name,
        phone,
      );
      await setCurrentUser(user);
      setCreatedUser({name: user.name, email: user.email});
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setLoading(false);
    // Navigate to role selection for new users
    navigation.replace('RoleSelection');
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
          <Icon name="person-add" size={60} color={theme.primary} />
          <Text style={[styles.title, {color: theme.text}]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            Sign up to get started
          </Text>
        </View>

        {/* Sign Up Form */}
        <View style={styles.form}>
          {/* Name */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <Icon
              name="person-outline"
              size={20}
              color={theme.textSecondary}
            />
            <TextInput
              style={[styles.input, {color: theme.text}]}
              placeholder="Full Name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <Icon name="mail-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, {color: theme.text}]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Phone */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <Icon name="call-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, {color: theme.text}]}
              placeholder="Phone Number"
              placeholderTextColor={theme.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <Icon
              name="lock-closed-outline"
              size={20}
              color={theme.textSecondary}
            />
            <TextInput
              style={[styles.input, {color: theme.text}]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <Icon
              name="lock-closed-outline"
              size={20}
              color={theme.textSecondary}
            />
            <TextInput
              style={[styles.input, {color: theme.text}]}
              placeholder="Confirm Password"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Icon
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.button,
              {backgroundColor: theme.primary},
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, {color: theme.textSecondary}]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.linkText, {color: theme.primary}]}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <AccountCreatedSuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        userName={createdUser?.name}
        userEmail={createdUser?.email}
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
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignUpScreen;
