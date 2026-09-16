import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Linking,
  Share,
  StatusBar,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {loginFromWeb as web, WEB} from '../fromWebCss/loginFromWeb.styles';
import {
  lookupPhone,
  loginPin,
  enableCustomerProfile,
  registerWithOtp,
  resetPin,
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
import {LoginStepIndicator} from '../components/login/LoginStepIndicator';
import {LoginLangSwitcher} from '../components/login/LoginLangSwitcher';
import {BootSplash} from '../components/BootSplash';
import {LoginTermsMini} from '../components/login/LoginTermsMini';
import {Banner} from 'sapvt-ltd-app-packages';
import PhoneNumberInput from '../components/PhoneNumberInput';
import {INDIA_DIAL_CODE, localTenDigits} from '../utils/phone';
import {useFirebasePhoneAuth} from '../hooks/useFirebasePhoneAuth';
import {isBrowserRequiredOtpError} from '../utils/canOpenHttpsUrl';
import NotificationService from '../services/notificationService';
import {PARTNER_WEB_URL} from '../services/partnerHandoff';
import {isWeakPin, LOGIN_PIN_LENGTH, LOGIN_PIN_RE} from '../components/login/pinUtils';

interface LoginScreenProps {
  navigation: any;
}

function authErrorMessage(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
  fallbackKey: string,
): string {
  if (isBrowserRequiredOtpError(error)) {
    return (
      t('auth.browserRequiredForOtp') ||
      'Phone verification needs a browser on this device. Please install or enable Chrome (or another browser) and try again.'
    );
  }
  const message =
    error instanceof Error
      ? error.message
      : String((error as {message?: string})?.message || '');
  return message || String(t(fallbackKey) || 'Something went wrong');
}

/**
 * phone → enter mobile, lookup
 * pin   → existing user: enter PIN
 * otp   → new number (signup) or forgot PIN: verify OTP
 * createPin → after OTP: set own PIN
 * showPin → reveal PIN once after create/reset
 */
type Step = 'phone' | 'pin' | 'otp' | 'createPin' | 'showPin';
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
  const [confirmPin, setConfirmPin] = useState('');
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('phone');
  const [otpMode, setOtpMode] = useState<OtpMode>('signup');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [partnerOnly, setPartnerOnly] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [otpBanner, setOtpBanner] = useState<OtpBanner | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const pinLoginInFlight = useRef(false);
  const firebasePhone = useFirebasePhoneAuth();

  const {
    isDarkMode,
    setCurrentUser,
    redirectAfterLogin,
    setRedirectAfterLogin,
  } = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();

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
        // Match customer-web: prefill last phone only. Never skip to PIN —
        // PIN is only after Continue → lookupPhone (exists && hasPin).
        const remembered = await getRememberedPhone();
        if (!mounted || !remembered) return;
        setPhoneNumber(localTenDigits(remembered.phoneLocal));
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
    void NotificationService.saveTokenToBackend();
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
    setConfirmPin('');

      if (lookup.exists && lookup.hasPin) {
        setStep('pin');
        return;
      }

      // New number (or no PIN yet) → Firebase OTP, then user sets their own PIN
      setOtpMode('signup');
      setOtpBanner(null);
      await firebasePhone.sendOtp(fullPhone());
      setStep('otp');
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: authErrorMessage(error, t, 'auth.loginError'),
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
    if (!LOGIN_PIN_RE.test(code)) {
      setInlineError(t('auth.pinMustBeFourDigits'));
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
      const msg = String(error?.message || '');
      if (
        error?.code === 'CUSTOMER_PROFILE_REQUIRED' ||
        /Create a Customer account/i.test(msg)
      ) {
        setPartnerOnly(true);
        setInlineError(null);
      } else {
        setInlineError(error.message || t('auth.incorrectPin'));
        setPin('');
      }
    } finally {
      pinLoginInFlight.current = false;
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    const code = pin.trim();
    if (!LOGIN_PIN_RE.test(code)) {
      setInlineError(t('auth.pinMustBeFourDigits'));
      return;
    }
    setCreatingCustomer(true);
    setInlineError(null);
    try {
      const result = await enableCustomerProfile(fullPhone(), code);
      await applySession(result.token, result.user);
      navigateAfterAuth();
    } catch (error: any) {
      setInlineError(error.message || t('auth.incorrectPin'));
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleForgotPin = async () => {
    setLoading(true);
    setInlineError(null);
    setOtp('');
    setNewPin('');
    setConfirmPin('');
    try {
      setOtpMode('forgot');
      setOtpBanner(null);
      await firebasePhone.sendOtp(fullPhone());
      setStep('otp');
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: authErrorMessage(error, t, 'auth.failedToSendCode'),
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
      setOtp('');
      setOtpBanner(null);
      await firebasePhone.sendOtp(fullPhone());
    } catch (error: any) {
      setInlineError(authErrorMessage(error, t, 'auth.failedToSendCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setInlineError(t('auth.pleaseEnterCode'));
      return;
    }
    setLoading(true);
    setInlineError(null);
    try {
      await firebasePhone.verifyOtp(otp.trim());
      setNewPin('');
      setConfirmPin('');
      setOtpBanner(null);
      setStep('createPin');
    } catch (error: any) {
      setInlineError(error.message || t('auth.failedToVerifyCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (!LOGIN_PIN_RE.test(newPin.trim())) {
      setInlineError(t('auth.pinMustBeFourDigits'));
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setInlineError(t('errors.pinMismatch'));
      return;
    }
    if (isWeakPin(newPin.trim())) {
      setInlineError(t('errors.weakPin'));
      return;
    }

    setLoading(true);
    setInlineError(null);
    try {
      const idToken = await firebasePhone.getIdToken();
      const result =
        otpMode === 'signup'
          ? await registerWithOtp(fullPhone(), newPin.trim(), {
              idToken,
            })
          : await resetPin(fullPhone(), newPin.trim(), {idToken});
      await firebasePhone.reset();
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
    await firebasePhone.reset();
    await clearAllCredentials();
    setCurrentUser(null);
    setPhoneNumber('');
    setPin('');
    setOtp('');
    setNewPin('');
    setConfirmPin('');
    setCreatedPin(null);
    setInlineError(null);
    setOtpBanner(null);
    setPartnerOnly(false);
    setOtpMode('signup');
    setStep('phone');
  };

  /** Soft step-back for Android hardware Back — does not clear session/remembered phone. */
  const goBackAuthStep = () => {
    if (loading || creatingCustomer || pinLoginInFlight.current) {
      return true;
    }
    if (step === 'pin') {
      setPin('');
      setInlineError(null);
      setPartnerOnly(false);
      setStep('phone');
      return true;
    }
    if (step === 'otp') {
      void firebasePhone.reset();
      setOtp('');
      setNewPin('');
      setConfirmPin('');
      setInlineError(null);
      setOtpBanner(null);
      if (otpMode === 'forgot') {
        setStep('pin');
      } else {
        setStep('phone');
      }
      return true;
    }
    if (step === 'createPin') {
      // OTP already consumed — resend so the user can verify again (matches customer web).
      setNewPin('');
      setConfirmPin('');
      setOtp('');
      setInlineError(null);
      setOtpBanner(null);
      void (async () => {
        setLoading(true);
        try {
          await firebasePhone.sendOtp(fullPhone());
          setStep('otp');
        } catch (error: any) {
          setInlineError(authErrorMessage(error, t, 'auth.failedToSendCode'));
          await firebasePhone.reset();
          setStep(otpMode === 'forgot' ? 'pin' : 'phone');
        } finally {
          setLoading(false);
        }
      })();
      return true;
    }
    if (step === 'showPin') {
      // Session already applied in finishWithPinReveal — continue into app.
      navigateAfterAuth();
      return true;
    }
    // phone: allow default system back (exit / leave Login)
    return false;
  };

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      goBackAuthStep,
    );
    return () => sub.remove();
  }, [step, loading, creatingCustomer, otpMode]);

  const titleForStep = () => {
    switch (step) {
      case 'createPin':
        return otpMode === 'forgot'
          ? t('login.createPinTitleForgot')
          : t('login.createPinTitle');
      case 'showPin':
        return t('login.createPinTitle');
      case 'pin':
        return t('login.pinTitle');
      case 'otp':
        return t('login.otpTitle');
      default:
        return t('login.welcome');
    }
  };

  const subtitleForStep = () => {
    switch (step) {
      case 'createPin':
      case 'showPin':
        return t('login.createPinSubtitle');
      case 'pin':
        return t('login.pinSubtitle');
      case 'otp':
        return otpMode === 'signup'
          ? t('login.otpSubtitle', {phone: fullPhone()})
          : t('login.otpSubtitleForgot', {phone: fullPhone()});
      default:
        return t('login.phoneSubtitle');
    }
  };

  if (booting) {
    return <BootSplash />;
  }

  const fillBtn = [web.primaryFill, loading && {opacity: 0.65}];

  return (
    <KeyboardAvoidingView
      style={web.layout}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={WEB.navyBand} />
      <View style={web.navyBand} />
      <View
        style={[
          web.stage,
          {
            paddingTop: Math.max(16, 8 + insets.top),
            paddingBottom: 12 + insets.bottom,
          },
        ]}>
        <View style={web.authStack}>
          <View style={web.card}>
            <ScrollView
              contentContainerStyle={web.cardScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={web.cardTop}>
                <View style={web.toolbar}>
                  {step === 'phone' || step === 'pin' || step === 'showPin' ? (
                    <View style={web.toolbarSpacer} />
                  ) : (
                    <TouchableOpacity
                      style={web.backToolbar}
                      onPress={() => void handleUseAnotherNumber()}
                      disabled={loading}
                      accessibilityRole="button"
                      accessibilityLabel={String(t('login.changeMobile'))}>
                      <Text style={web.backText}>{t('login.changeMobile')}</Text>
                    </TouchableOpacity>
                  )}
                  <LoginLangSwitcher />
                </View>
                <LoginStepIndicator
                  theme={theme}
                  step={step}
                  flow={
                    step === 'pin'
                      ? 'pinLogin'
                      : step === 'otp' ||
                          step === 'createPin' ||
                          step === 'showPin'
                        ? 'otpFlow'
                        : 'preview'
                  }
                />
                <View style={web.brandRow}>
                  <Image
                    source={require('../assets/fromWeb/logo.png')}
                    style={web.logo}
                    resizeMode="contain"
                    accessibilityLabel={String(t('login.productName'))}
                  />
                  <View style={web.brandCopy}>
                    <Text style={web.brandName}>{t('login.productName')}</Text>
                    <Text style={web.brandTag}>{t('login.tagline')}</Text>
                  </View>
                </View>
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

              <View style={web.cardBody}>
                <View style={web.stepHeader}>
                  {step === 'otp' ? (
                    <View style={[web.stepIcon, web.stepIconOtp]}>
                      <Icon name="chatbubble-ellipses" size={26} color={WEB.otpIcon} />
                    </View>
                  ) : null}
                  {step === 'pin' || step === 'createPin' || step === 'showPin' ? (
                    <View style={[web.stepIcon, web.stepIconPin]}>
                      <Icon name="key" size={26} color={WEB.primary} />
                    </View>
                  ) : null}
                  <Text style={web.stepTitle}>{titleForStep()}</Text>
                  <Text style={web.stepSub}>{subtitleForStep()}</Text>
                </View>

                {step === 'phone' ? (
                  <View style={web.form}>
                    <Text style={web.label}>{t('login.mobileLabel')}</Text>
                    <PhoneNumberInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder={t('login.mobilePlaceholder')}
                      editable={!loading}
                      borderColor={WEB.border}
                      backgroundColor={WEB.card}
                      prefixBackgroundColor="#F5F5F5"
                      textColor={WEB.text}
                      placeholderTextColor={WEB.textSecondary}
                    />
                    <TouchableOpacity
                      style={fillBtn}
                      onPress={() => void handleContinuePhone()}
                      disabled={loading}>
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={web.primaryFillText}>{t('login.continue')}</Text>
                      )}
                    </TouchableOpacity>
                    <View style={web.trustBadge}>
                      <Icon name="shield-checkmark" size={14} color={WEB.primary} />
                      <Text style={web.trustBadgeText}>{t('login.phoneSafe')}</Text>
                    </View>
                  </View>
                ) : null}

                {step === 'pin' ? (
                  <View style={web.form}>
                    <View style={web.readonlyPhone}>
                      <View style={web.readonlyPhoneTop}>
                        <Text style={web.readonlyPhoneLabel}>
                          {t('login.mobileLabel')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => void handleUseAnotherNumber()}
                          disabled={loading}
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                          accessibilityRole="button"
                          accessibilityLabel={String(t('login.changeMobile'))}>
                          <Text style={web.changeNumberLink}>
                            {t('shareContact.change') || t('common.change') || 'Change'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={web.readonlyPhoneValue}>{fullPhone()}</Text>
                    </View>
                    <Text style={web.label}>{t('login.enterPinLabel')}</Text>
                    <PinBoxesInput
                      value={pin}
                      length={LOGIN_PIN_LENGTH}
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
                      cellBackground={WEB.card}
                      cellBorder={WEB.border}
                      textColor={WEB.text}
                      focusedBorder={WEB.primary}
                    />
                    {partnerOnly ? (
                      <View style={web.customerOnly}>
                        <Text style={web.customerOnlyTitle}>{t('login.partnerOnlyTitle')}</Text>
                        <Text style={web.customerOnlyBody}>{t('login.partnerOnlyBody')}</Text>
                        <TouchableOpacity
                          style={[web.primaryFill, (loading || creatingCustomer || pin.length !== LOGIN_PIN_LENGTH) && {opacity: 0.65}]}
                          onPress={() => void handleCreateCustomer()}
                          disabled={loading || creatingCustomer || pin.length !== LOGIN_PIN_LENGTH}>
                          {creatingCustomer ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={web.primaryFillText}>{t('login.createCustomerAccount')}</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[web.guestBtn, loading && {opacity: 0.65}]}
                          onPress={() => void Linking.openURL(PARTNER_WEB_URL)}
                          disabled={loading}
                          accessibilityRole="button"
                          accessibilityLabel={String(t('login.partnerLogin'))}>
                          <Text style={web.guestBtnText}>{t('login.partnerLogin')}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        {inlineError ? <Text style={web.fieldError}>{inlineError}</Text> : null}
                        <TouchableOpacity
                          style={fillBtn}
                          onPress={() => void handleLoginWithPin()}
                          disabled={loading || pin.length !== LOGIN_PIN_LENGTH}>
                          {loading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={web.primaryFillText}>{t('login.loginCta')}</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                    <View style={web.linkRow}>
                      <TouchableOpacity style={web.textLink} onPress={() => void handleForgotPin()} disabled={loading}>
                        <Text style={web.textLinkLabel}>{t('login.forgotPin')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {step === 'otp' ? (
                  <View style={web.form}>
                    <View style={web.readonlyPhone}>
                      <View style={web.readonlyPhoneTop}>
                        <Text style={web.readonlyPhoneLabel}>
                          {t('login.mobileLabel')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => void handleUseAnotherNumber()}
                          disabled={loading}
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                          accessibilityRole="button"
                          accessibilityLabel={String(t('login.changeMobile'))}>
                          <Text style={web.changeNumberLink}>
                            {t('shareContact.change') || t('common.change') || 'Change'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={web.readonlyPhoneValue}>{fullPhone()}</Text>
                    </View>
                    <Text style={web.label}>{t('login.otpLabel')}</Text>
                    <View style={web.otpInput}>
                      <Icon name="chatbubble-ellipses-outline" size={20} color={WEB.textSecondary} />
                      <TextInput
                        style={web.otpField}
                        placeholder={String(t('login.otpLabel'))}
                        placeholderTextColor={WEB.textSecondary}
                        value={otp}
                        onChangeText={text => {
                          setOtp(text.replace(/\D/g, '').slice(0, 6));
                          setInlineError(null);
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!loading}
                        autoFocus
                      />
                    </View>
                    {inlineError ? <Text style={web.fieldError}>{inlineError}</Text> : null}
                    <TouchableOpacity
                      style={[fillBtn, otp.length !== 6 && {opacity: 0.65}]}
                      onPress={() => void handleVerifyOtp()}
                      disabled={loading || otp.length !== 6}>
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={web.primaryFillText}>{t('login.verifyOtp')}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[web.textLink, web.textLinkCenter]}
                      onPress={() => void handleResendOtp()}
                      disabled={loading}>
                      <Text style={web.textLinkLabel}>{t('login.resendOtp')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {step === 'createPin' ? (
                  <View style={web.form}>
                    <View style={web.readonlyPhone}>
                      <View style={web.readonlyPhoneTop}>
                        <Text style={web.readonlyPhoneLabel}>
                          {t('login.mobileLabel')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => void handleUseAnotherNumber()}
                          disabled={loading}
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                          accessibilityRole="button"
                          accessibilityLabel={String(t('login.changeMobile'))}>
                          <Text style={web.changeNumberLink}>
                            {t('shareContact.change') || t('common.change') || 'Change'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={web.readonlyPhoneValue}>{fullPhone()}</Text>
                    </View>
                    <Text style={web.label}>{t('login.newPinLabel')}</Text>
                    <PinBoxesInput
                      value={newPin}
                      length={LOGIN_PIN_LENGTH}
                      onChange={text => {
                        setNewPin(text);
                        setInlineError(null);
                      }}
                      editable={!loading}
                      autoFocus
                      secure={false}
                      cellBackground={WEB.card}
                      cellBorder={WEB.border}
                      textColor={WEB.text}
                      focusedBorder={WEB.primary}
                    />
                    <Text style={web.label}>{t('login.confirmPinLabel')}</Text>
                    <PinBoxesInput
                      value={confirmPin}
                      length={LOGIN_PIN_LENGTH}
                      onChange={text => {
                        setConfirmPin(text);
                        setInlineError(null);
                      }}
                      editable={!loading}
                      secure={false}
                      cellBackground={WEB.card}
                      cellBorder={WEB.border}
                      textColor={WEB.text}
                      focusedBorder={WEB.primary}
                    />
                    {inlineError ? <Text style={web.fieldError}>{inlineError}</Text> : null}
                    <TouchableOpacity
                      style={[
                        fillBtn,
                        (newPin.length !== LOGIN_PIN_LENGTH ||
                          confirmPin.length !== LOGIN_PIN_LENGTH) && {opacity: 0.65},
                      ]}
                      onPress={() => void handleSetPin()}
                      disabled={
                        loading ||
                        newPin.length !== LOGIN_PIN_LENGTH ||
                        confirmPin.length !== LOGIN_PIN_LENGTH
                      }>
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={web.primaryFillText}>{t('login.setPinCta')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}

                {step === 'showPin' && createdPin ? (
                  <View style={web.form}>
                    <View style={web.pinReveal}>
                      <Text style={web.label}>{t('login.pinLabel')}</Text>
                      <Text style={web.pinValue}>{createdPin}</Text>
                    </View>
                    <TouchableOpacity style={web.primaryFill} onPress={navigateAfterAuth}>
                      <Text style={web.primaryFillText}>{t('login.continue')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {step !== 'showPin' ? (
                  <>
                    <View style={web.orRow}>
                      <View style={web.orLine} />
                      <Text style={web.orText}>{t('auth.or')}</Text>
                      <View style={web.orLine} />
                    </View>
                    <TouchableOpacity style={web.guestBtn} onPress={handleContinueAsGuest} disabled={loading}>
                      <Icon name="person-outline" size={20} color={WEB.text} />
                      <Text style={web.guestBtnText}>{t('login.continueGuest')}</Text>
                    </TouchableOpacity>
                    <Text style={web.guestHint}>{t('login.guestHint')}</Text>
                  </>
                ) : null}

                <View style={web.extras}>
                  <View style={web.utilRow}>
                    <TouchableOpacity style={web.utilBtn} onPress={() => navigation.navigate('HelpSupport')}>
                      <Icon name="help-circle-outline" size={20} color={WEB.primary} />
                      <Text style={web.utilBtnText}>{t('login.helpCta')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={web.utilBtn}
                      onPress={() => {
                        void Share.share({
                          message: String(t('login.utilShareHint')) + ' https://akansho.com',
                          url: 'https://akansho.com',
                        });
                      }}>
                      <Icon name="share-social-outline" size={20} color={WEB.primary} />
                      <Text style={web.utilBtnText}>{t('login.utilShareShort')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={web.extrasBottom}>
                    <TouchableOpacity
                      style={web.partnerLink}
                      onPress={() => void Linking.openURL(PARTNER_WEB_URL)}>
                      <Text style={web.partnerLinkTitle}>{t('login.customerBannerTitle')}</Text>
                      <Text style={web.partnerLinkCta}>{t('login.customerBannerCta')}</Text>
                    </TouchableOpacity>
                    <View style={web.extrasFoot}>
                      <Text style={web.extrasTrust}>{t('login.heroSafety')}</Text>
                      <LoginTermsMini
                        onTerms={() => navigation.navigate('LegalDocument', {kind: 'terms'})}
                        onPrivacy={() => navigation.navigate('LegalDocument', {kind: 'privacy'})}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

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

export default LoginScreen;
