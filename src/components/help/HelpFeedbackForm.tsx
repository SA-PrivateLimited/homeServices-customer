/**
 * Customer feedback form — Help → Give feedback.
 * Uses authenticated phone silently when available; same /feedback payload.
 */

import React, {useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {submitFeedback} from '../../services/api/feedbackApi';
import {WHATSAPP_SUPPORT_URL} from '../../config/support';
import {getUserFacingErrorMessage} from '../../utils/userFacingError';
import {openExternalUrl} from '../../utils/openExternalUrl';
import {useStore} from '../../store';
import {localTenDigits} from '../../utils/phone';
import PhoneNumberInput from '../PhoneNumberInput';
import {lightTheme, darkTheme} from '../../utils/theme';
import AlertModal from '../AlertModal';

const MESSAGE_MAX = 500;
const MESSAGE_MIN = 5;

export function HelpFeedbackForm({
  onClose,
  onBack,
  source = 'customer_app',
  showChrome = true,
}: {
  onClose: () => void;
  /** Return to Help home (preferred over closing the whole sheet). */
  onBack?: () => void;
  source?: 'customer_app' | 'customer_login';
  /** When false, parent already shows the screen header. */
  showChrome?: boolean;
}) {
  const {t} = useTranslation();
  const {currentUser, isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const knownPhone = useMemo(() => {
    const raw =
      (currentUser as any)?.phone ||
      (currentUser as any)?.mobile ||
      (currentUser as any)?.phoneNumber ||
      '';
    return localTenDigits(String(raw));
  }, [currentUser]);

  const isAuthed = Boolean(currentUser?.id || currentUser?._id);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(knownPhone);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [waAlertVisible, setWaAlertVisible] = useState(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= MESSAGE_MIN && !sending;

  const resolvePhoneForPayload = () => {
    if (knownPhone.length === 10) return knownPhone;
    return localTenDigits(phone).slice(-10);
  };

  const sendAdmin = async () => {
    if (!canSubmit) return;
    if (trimmed.length < MESSAGE_MIN) {
      setError(
        String(
          t('login.feedbackTooShort') ||
            t('login.feedbackRequired') ||
            'Please write a bit more.',
        ),
      );
      return;
    }
    setSending(true);
    setError(null);
    try {
      await submitFeedback({
        message: trimmed,
        phone: resolvePhoneForPayload(),
        source,
        app: 'customer',
      });
      setSent(true);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, 'generic'));
    } finally {
      setSending(false);
    }
  };

  const sendWhatsApp = () => {
    const body = trimmed
      ? `${String(t('login.feedbackWaPrefix') || 'Hi Akansho,')}\n\n${trimmed}`
      : String(t('login.feedbackWaPrefix') || 'Hi Akansho,');
    void openExternalUrl(
      `${WHATSAPP_SUPPORT_URL}?text=${encodeURIComponent(body)}`,
    ).then(ok => {
      if (!ok) setWaAlertVisible(true);
    });
  };

  const handleBack = () => {
    if (onBack) onBack();
    else onClose();
  };

  if (sent) {
    return (
      <View style={[styles.wrap, {paddingHorizontal: showChrome ? 14 : 0}]}>
        {showChrome ? (
          <Pressable
            style={styles.chrome}
            onPress={onClose}
            accessibilityRole="button">
            <Icon name="arrow-back" size={22} color={theme.text} />
            <Text style={[styles.chromeTitle, {color: theme.text}]}>
              {t('help.feedbackTitle') || t('help.giveFeedback') || 'Send feedback'}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.successBox}>
          <View
            style={[
              styles.successIcon,
              {backgroundColor: `${theme.success || '#38A169'}22`},
            ]}>
            <Icon
              name="checkmark-circle"
              size={36}
              color={theme.success || '#38A169'}
            />
          </View>
          <Text style={[styles.successTitle, {color: theme.text}]}>
            {t('help.feedbackThanksTitle') ||
              t('login.feedbackSaved') ||
              'Thank you for your feedback'}
          </Text>
          <Text style={[styles.successBody, {color: theme.textSecondary}]}>
            {t('help.feedbackThanksBody') ||
              'Your feedback helps us improve Akansho.'}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, {backgroundColor: theme.primary}]}
            onPress={onClose}
            accessibilityRole="button">
            <Text style={styles.primaryBtnText}>
              {t('shareContact.done') || t('common.done') || 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          {paddingHorizontal: showChrome ? 14 : 0},
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {showChrome ? (
          <Pressable
            style={styles.chrome}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={String(t('common.back') || 'Back')}>
            <Icon name="arrow-back" size={22} color={theme.text} />
            <Text style={[styles.chromeTitle, {color: theme.text}]}>
              {t('help.feedbackTitle') ||
                t('help.giveFeedback') ||
                'Send feedback'}
            </Text>
          </Pressable>
        ) : null}

        <Text style={[styles.title, {color: theme.text}]}>
          {t('help.feedbackLead') ||
            t('login.feedbackInlineTitle') ||
            'Help us improve Akansho'}
        </Text>
        <Text style={[styles.hint, {color: theme.textSecondary}]}>
          {t('help.feedbackHint') ||
            t('login.feedbackMessageHint') ||
            'Tell us what would make Akansho better for you.'}
        </Text>

        <Text style={[styles.label, {color: theme.text}]}>
          {t('help.feedbackPrompt') ||
            t('login.feedbackMessagePlaceholder') ||
            'What would you like us to improve?'}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.border,
              color: theme.text,
              backgroundColor: theme.card,
            },
          ]}
          multiline
          textAlignVertical="top"
          value={message}
          onChangeText={v => {
            setMessage(v.slice(0, MESSAGE_MAX));
            setError(null);
          }}
          placeholder={String(
            t('help.feedbackPlaceholder') ||
              t('login.feedbackMessagePlaceholder') ||
              'Tell us what you think...',
          )}
          placeholderTextColor={theme.textSecondary}
        />
        <Text style={[styles.counter, {color: theme.textSecondary}]}>
          {trimmed.length}/{MESSAGE_MAX}
        </Text>

        {!isAuthed || knownPhone.length !== 10 ? (
          <View style={styles.phoneBlock}>
            <Text style={[styles.label, {color: theme.text}]}>
              {t('login.feedbackPhoneOptional') || 'Mobile number (optional)'}
            </Text>
            <PhoneNumberInput
              value={phone}
              onChangeText={setPhone}
              placeholder={String(
                t('login.mobilePlaceholder') || '10-digit mobile',
              )}
              borderColor={theme.border}
              backgroundColor={theme.card}
              prefixBackgroundColor={isDarkMode ? theme.border : '#F5F5F5'}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        ) : null}

        {error ? (
          <Text style={[styles.err, {color: theme.error}]}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: theme.primary,
              opacity: canSubmit ? 1 : 0.5,
            },
          ]}
          onPress={() => void sendAdmin()}
          disabled={!canSubmit}
          accessibilityRole="button">
          <Text style={styles.primaryBtnText}>
            {sending
              ? t('common.sending') || 'Sending…'
              : t('help.feedbackSend') ||
                t('login.feedbackSubmit') ||
                'Send feedback'}
          </Text>
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={[styles.orLine, {backgroundColor: theme.border}]} />
          <Text style={[styles.orText, {color: theme.textSecondary}]}>
            {t('common.or') || 'or'}
          </Text>
          <View style={[styles.orLine, {backgroundColor: theme.border}]} />
        </View>

        <TouchableOpacity
          style={[styles.secondaryBtn, {borderColor: theme.border}]}
          onPress={sendWhatsApp}
          accessibilityRole="button">
          <Icon name="logo-whatsapp" size={18} color="#25D366" />
          <Text style={[styles.secondaryBtnText, {color: theme.text}]}>
            {t('help.feedbackWhatsApp') ||
              t('login.feedbackWhatsAppSend') ||
              'Send feedback on WhatsApp'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <AlertModal
        visible={waAlertVisible}
        title={String(t('help.feedbackWhatsApp') || 'WhatsApp')}
        message={String(
          t('help.unableToOpenWhatsApp') ||
            "WhatsApp isn't available on this device.",
        )}
        type="warning"
        onClose={() => setWaAlertVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  wrap: {paddingTop: 4, paddingBottom: 24, gap: 8},
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    marginBottom: 8,
  },
  chromeTitle: {fontSize: 17, fontWeight: '700'},
  title: {fontSize: 18, fontWeight: '700', lineHeight: 24},
  hint: {fontSize: 14, lineHeight: 20, marginBottom: 4},
  label: {fontSize: 13, fontWeight: '600', marginTop: 4},
  input: {
    minHeight: 120,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  counter: {fontSize: 11, alignSelf: 'flex-end'},
  phoneBlock: {gap: 6, marginTop: 4},
  err: {fontSize: 13, marginTop: 2},
  primaryBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  orLine: {flex: 1, height: StyleSheet.hairlineWidth},
  orText: {fontSize: 12, fontWeight: '600'},
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  secondaryBtnText: {fontSize: 14, fontWeight: '700'},
  successBox: {alignItems: 'center', paddingTop: 24, gap: 10},
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
});
