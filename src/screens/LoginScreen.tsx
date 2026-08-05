import React, {useEffect, useRef, useState} from 'react';
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
import {lightTheme, darkTheme} from '../utils/theme';
import {
  lookupPhone,
  loginPin,
  registerWithOtp,
  resetPin,
  sendPhoneOtp,
} from '../services/api/phoneAuthApi';
import {
  getRememberedPhone,
  normalizeUser,
  rememberPhone,
  setSession,
  clearAllCredentials,
} from '../services/session';
import PinBoxesInput from '../components/PinBoxesInput';
import AlertModal from '../components/AlertModal';
import useTranslation from '../hooks/useTranslation';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {Banner} from 'sapvt-ltd-app-packages';
import PhoneNumberInput from '../components/PhoneNumberInput';
import {INDIA_DIAL_CODE, localTenDigits} from '../utils/phone';

interface LoginScreenProps {
  navigation: any;
}

/**
 * phone → enter mobile, lookup
 * pin   → existing user: enter PIN
 * otp   → new number (signup) or forgot PIN: OTP + set own PIN
 * showPin → reveal PIN once after create/reset
 */
type Step = 'phone' | 'pin' | 'otp' | 'showPin';
type OtpMode = 'signup' | 'forgot';

type OtpBanner = {
  otp: string;
  phone: string;
  expiresAt: number;
};

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('phone');
  const [otpMode, setOtpMode] = useState<OtpMode>('signup');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [otpBanner, setOtpBanner] = useState<OtpBanner | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const pinLoginInFlight = useRef(false);

  const {
    isDarkMode,
    setCurrentUser,
    redirectAfterLogin,
    setRedirectAfterLogin,
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

  const canGoBack = navigation.canGoBack?.() === true;

  const fullPhone = () =>
    INDIA_DIAL_CODE + localTenDigits(phoneNumber);

  const applyOtpFromResponse = (result: {
    otp?: string;
    expiresAt?: string;
    expiresInSeconds?: number;
    phoneNumber?: string;
  }) => {
    if (!result?.otp) {
      setOtpBanner(null);
      setOtpSecondsLeft(0);
      return;
    }
    const expiresAt = result.expiresAt
      ? Date.parse(result.expiresAt)
      : Date.now() + (result.expiresInSeconds || 300) * 1000;
    setOtpBanner({
      otp: result.otp,
      phone: result.phoneNumber || fullPhone(),
      expiresAt,
    });
    setOtpSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    // Prefill so user can continue quickly; they can still edit
    setOtp(result.otp);
  };

  useEffect(() => {
    if (!otpBanner) {
      setOtpSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((otpBanner.expiresAt - Date.now()) / 1000),
      );
      setOtpSecondsLeft(left);
      if (left <= 0) {
        setOtpBanner(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [otpBanner]);

  useEffect(() => {
    let mounted = true;
    const loadRemembered = async () => {
      try {
        const remembered = await getRememberedPhone();
        if (!mounted || !remembered) return;
        setPhoneNumber(localTenDigits(remembered.phoneLocal));
        // Within 30 days: PIN only
        setStep('pin');
      } finally {
        if (mounted) setBooting(false);
      }
    };
    void loadRemembered();
    return () => {
      mounted = false;
    };
  }, []);

  const navigateAfterAuth = () => {
    if (redirectAfterLogin?.route) {
      const redirect = redirectAfterLogin;
      setRedirectAfterLogin(null);
      navigation.reset({
        index: 1,
        routes: [
          {name: 'Main'},
          {name: redirect.route, params: redirect.params},
        ],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{name: 'Main'}],
    });
  };

  const handleContinueAsGuest = () => {
    setRedirectAfterLogin(null);
    if (canGoBack) {
      navigation.goBack();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{name: 'Main'}],
    });
  };

  const applySession = async (token: string, userRaw: any) => {
    const user = normalizeUser({
      ...userRaw,
      role: 'customer',
      phoneVerified: true,
    });
    await setSession(token, user);
    await rememberPhone(
      localTenDigits(phoneNumber),
      INDIA_DIAL_CODE,
    );
    setCurrentUser(user);
  };

  const handleContinuePhone = async () => {
    const numericPhone = phoneNumber.replace(/\D/g, '');
    if (numericPhone.length !== 10) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('auth.pleaseEnterValidPhone'),
        type: 'error',
      });
      return;
    }

    setLoading(true);
    setInlineError(null);
    try {
      const lookup = await lookupPhone(fullPhone());
      await rememberPhone(numericPhone, INDIA_DIAL_CODE);
      setPin('');
      setOtp('');
      setNewPin('');

      if (lookup.exists && lookup.hasPin) {
        setStep('pin');
        return;
      }

      // New number (or no PIN yet) → OTP, then user sets their own PIN
      const result = await sendPhoneOtp(fullPhone());
      setOtpMode('signup');
      setStep('otp');
      applyOtpFromResponse(result);
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('auth.loginError'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const finishWithPinReveal = async (
    token: string,
    user: any,
    revealedPin?: string,
  ) => {
    await applySession(token, user);
    if (revealedPin) {
      setCreatedPin(revealedPin);
      setStep('showPin');
    } else {
      navigateAfterAuth();
    }
  };

  const handleLoginWithPin = async (pinOverride?: string) => {
    const code = (pinOverride ?? pin).trim();
    if (!/^\d{6}$/.test(code)) {
      setInlineError(t('auth.pinMustBeSixDigits'));
      return;
    }
    if (pinLoginInFlight.current || loading) return;
    pinLoginInFlight.current = true;
    setLoading(true);
    setInlineError(null);
    try {
      const result = await loginPin(fullPhone(), code);
      await applySession(result.token, result.user);
      navigateAfterAuth();
    } catch (error: any) {
      setInlineError(error.message || t('auth.incorrectPin'));
      setPin('');
    } finally {
      pinLoginInFlight.current = false;
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    setLoading(true);
    setInlineError(null);
    setOtp('');
    setNewPin('');
    try {
      const result = await sendPhoneOtp(fullPhone());
      setOtpMode('forgot');
      setStep('otp');
      applyOtpFromResponse(result);
    } catch (error: any) {
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

  const handleResendOtp = async () => {
    setLoading(true);
    setInlineError(null);
    try {
      const result = await sendPhoneOtp(fullPhone());
      applyOtpFromResponse(result);
    } catch (error: any) {
      setInlineError(error.message || t('auth.failedToSendCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSetPin = async () => {
    if (!otp.trim()) {
      setInlineError(t('auth.pleaseEnterCode'));
      return;
    }
    if (!/^\d{6}$/.test(newPin.trim())) {
      setInlineError(t('auth.pinMustBeSixDigits'));
      return;
    }

    setLoading(true);
    setInlineError(null);
    try {
      const result =
        otpMode === 'signup'
          ? await registerWithOtp(fullPhone(), otp.trim(), newPin.trim())
          : await resetPin(fullPhone(), otp.trim(), newPin.trim());
      await finishWithPinReveal(
        result.token,
        result.user,
        result.pin || newPin.trim(),
      );
      setOtpBanner(null);
    } catch (error: any) {
      setInlineError(error.message || t('auth.failedToVerifyCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherNumber = async () => {
    await clearAllCredentials();
    setCurrentUser(null);
    setPhoneNumber('');
    setPin('');
    setOtp('');
    setNewPin('');
    setCreatedPin(null);
    setInlineError(null);
    setOtpBanner(null);
    setOtpMode('signup');
    setStep('phone');
  };

  const subtitleForStep = () => {
    switch (step) {
      case 'showPin':
        return t('auth.saveYourPinLead');
      case 'pin':
        return t('auth.enterPinLead');
      case 'otp':
        return otpMode === 'signup'
          ? t('auth.signupOtpLead')
          : t('auth.enterOtpLead');
      default:
        return t('auth.loginWithPinLead');
    }
  };

  if (booting) {
    return (
      <View
        style={[
          styles.container,
          styles.boot,
          {backgroundColor: theme.background},
        ]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View style={styles.backButton} />
          <LanguageSwitcher compact />
        </View>

        {otpBanner && otpSecondsLeft > 0 ? (
          <Banner
            variant="info"
            title={t('auth.otpBannerTitle', {phone: otpBanner.phone})}
            detail={t('auth.otpExpiresIn', {time: formatMmSs(otpSecondsLeft)})}
            meta={otpBanner.otp}
            onDismiss={() => setOtpBanner(null)}
          />
        ) : null}

        <View style={styles.header}>
          <Icon name="phone-portrait-outline" size={56} color={theme.primary} />
          <Text style={[styles.title, {color: theme.text}]}>HomeServices</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            {subtitleForStep()}
          </Text>
        </View>

        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={[styles.phoneLabel, {color: theme.textSecondary}]}>
              {t('auth.phone')}
            </Text>
            <PhoneNumberInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder={t('auth.phoneTenDigitsHint')}
              editable={!loading}
              borderColor={theme.border}
              backgroundColor={theme.card}
              prefixBackgroundColor={isDarkMode ? theme.border : '#F5F5F5'}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              style={{marginBottom: 16}}
            />

            <TouchableOpacity
              style={[
                styles.button,
                {backgroundColor: theme.primary},
                loading && styles.buttonDisabled,
              ]}
              onPress={() => void handleContinuePhone()}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.continue')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'pin' ? (
          <View style={styles.form}>
            <Text style={[styles.codeHint, {color: theme.textSecondary}]}>
              {t('auth.enterPinFor', {phone: fullPhone()})}
            </Text>
            <PinBoxesInput
              value={pin}
              length={6}
              onChange={text => {
                setPin(text);
                setInlineError(null);
              }}
              onComplete={code => {
                void handleLoginWithPin(code);
              }}
              editable={!loading}
              autoFocus
              secure={false}
              cellBackground={theme.card}
              cellBorder={theme.border}
              textColor={theme.text}
              focusedBorder={theme.primary}
            />
            {inlineError ? (
              <Text style={styles.inlineError}>{inlineError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                {backgroundColor: theme.primary},
                loading && styles.buttonDisabled,
              ]}
              onPress={() => void handleLoginWithPin()}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => void handleForgotPin()}
              disabled={loading}>
              <Text style={[styles.resendText, {color: theme.primary}]}>
                {t('auth.forgotPin')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => void handleUseAnotherNumber()}
              disabled={loading}>
              <Text style={[styles.resendText, {color: theme.textSecondary}]}>
                {t('auth.useAnotherNumber')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'otp' ? (
          <View style={styles.form}>
            <Text style={[styles.codeHint, {color: theme.textSecondary}]}>
              {t('auth.codeSentHint', {phone: fullPhone()})}
            </Text>
            <View
              style={[
                styles.inputContainer,
                {backgroundColor: theme.card, borderColor: theme.border},
              ]}>
              <Icon
                name="chatbubble-ellipses-outline"
                size={20}
                color={theme.textSecondary}
              />
              <TextInput
                style={[styles.input, {color: theme.text, letterSpacing: 4}]}
                placeholder={t('auth.verificationCode')}
                placeholderTextColor={theme.textSecondary}
                value={otp}
                onChangeText={text => {
                  setOtp(text.replace(/\D/g, '').slice(0, 8));
                  setInlineError(null);
                }}
                keyboardType="number-pad"
                maxLength={8}
                editable={!loading}
                autoFocus
              />
            </View>

            <Text style={[styles.pinLabelInline, {color: theme.textSecondary}]}>
              {t('auth.chooseSixDigitPin')}
            </Text>
            <PinBoxesInput
              value={newPin}
              length={6}
              onChange={text => {
                setNewPin(text);
                setInlineError(null);
              }}
              editable={!loading}
              secure={false}
              cellBackground={theme.card}
              cellBorder={theme.border}
              textColor={theme.text}
              focusedBorder={theme.primary}
            />
            <Text style={[styles.pinHint, {color: theme.textSecondary}]}>
              {t('auth.setYourOwnPinHint')}
            </Text>
            {inlineError ? (
              <Text style={styles.inlineError}>{inlineError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                {backgroundColor: theme.primary},
                loading && styles.buttonDisabled,
              ]}
              onPress={() => void handleVerifyOtpAndSetPin()}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {otpMode === 'signup'
                    ? t('auth.verifyAndCreateAccount')
                    : t('auth.verifyOtpAndSetPin')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => void handleResendOtp()}
              disabled={loading}>
              <Text style={[styles.resendText, {color: theme.primary}]}>
                {t('auth.resendOtp')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                if (otpMode === 'forgot') {
                  setStep('pin');
                } else {
                  void handleUseAnotherNumber();
                  return;
                }
                setInlineError(null);
                setOtp('');
                setNewPin('');
                setOtpBanner(null);
              }}
              disabled={loading}>
              <Text style={[styles.resendText, {color: theme.textSecondary}]}>
                {otpMode === 'forgot'
                  ? t('auth.backToPin')
                  : t('auth.useAnotherNumber')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'showPin' && createdPin ? (
          <View style={styles.form}>
            <View
              style={[
                styles.pinReveal,
                {backgroundColor: theme.card, borderColor: theme.primary},
              ]}>
              <Text style={[styles.pinLabel, {color: theme.textSecondary}]}>
                {t('auth.yourPin')}
              </Text>
              <Text style={[styles.pinValue, {color: theme.text}]}>
                {createdPin}
              </Text>
              <Text style={[styles.pinHint, {color: theme.textSecondary}]}>
                {t('auth.pinReuseHint')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, {backgroundColor: theme.primary}]}
              onPress={navigateAfterAuth}>
              <Text style={styles.buttonText}>{t('auth.continue')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step !== 'showPin' ? (
          <>
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, {backgroundColor: theme.border}]} />
              <Text style={[styles.dividerText, {color: theme.textSecondary}]}>
                {t('auth.or')}
              </Text>
              <View style={[styles.divider, {backgroundColor: theme.border}]} />
            </View>

            <TouchableOpacity
              style={[
                styles.guestButton,
                {backgroundColor: theme.card, borderColor: theme.border},
                loading && styles.buttonDisabled,
              ]}
              onPress={handleContinueAsGuest}
              disabled={loading}>
              <Icon name="person-outline" size={20} color={theme.text} />
              <Text style={[styles.guestButtonText, {color: theme.text}]}>
                {t('auth.continueAsGuest')}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.guestHint, {color: theme.textSecondary}]}>
              {t('auth.guestBookingHint')}
            </Text>
          </>
        ) : null}
      </ScrollView>

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
  boot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1B6B4A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  otpBannerTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 4,
  },
  otpBannerCode: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: 4,
  },
  otpBannerExpiry: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  form: {
    marginBottom: 8,
  },
  phoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    height: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    paddingVertical: 0,
    letterSpacing: 6,
  },
  codeHint: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  pinLabelInline: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  inlineError: {
    color: '#E53E3E',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pinReveal: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  pinLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  pinValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 10,
    marginBottom: 12,
  },
  pinHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
  },
  guestButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  guestHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
});

export default LoginScreen;
