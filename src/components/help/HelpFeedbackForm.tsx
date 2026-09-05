import React, {useState} from 'react';
import {Linking, Text, View, StyleSheet} from 'react-native';
import {Button, Input, PhoneNumberInput} from 'sapvt-ltd-app-packages';
import {useTranslation} from 'react-i18next';
import {submitFeedback} from '../../services/api/feedbackApi';
import {WHATSAPP_SUPPORT_URL} from '../../config/support';
import {getUserFacingErrorMessage} from '../../utils/userFacingError';

const MESSAGE_MAX = 500;

export function HelpFeedbackForm({
  onClose,
  source = 'customer_app',
}: {
  onClose: () => void;
  source?: 'customer_app' | 'customer_login';
}) {
  const {t} = useTranslation();
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const canSubmit = message.trim().length >= 5 && !sending;

  const sendAdmin = async () => {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      await submitFeedback({
        message: message.trim(),
        phone: phone.replace(/\D/g, '').slice(-10),
        source,
        app: 'customer',
      });
      onClose();
    } catch (err) {
      setError(getUserFacingErrorMessage(err, 'generic'));
    } finally {
      setSending(false);
    }
  };

  const sendWhatsApp = () => {
    const text = encodeURIComponent(message.trim());
    void Linking.openURL(`${WHATSAPP_SUPPORT_URL}?text=${text}`);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('login.feedbackDialogLead')}</Text>
      <Text style={styles.hint}>{t('login.feedbackMessageHint')}</Text>
      <Input
        multiline
        value={message}
        onChangeText={v => setMessage(v.slice(0, MESSAGE_MAX))}
        placeholder={t('login.feedbackMessagePlaceholder')}
      />
      <PhoneNumberInput value={phone} onChangeText={setPhone} />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Button
        variant="primary"
        block
        loading={sending}
        disabled={!canSubmit}
        onPress={() => void sendAdmin()}>
        {t('login.feedbackSubmit')}
      </Button>
      <Button variant="secondary" block onPress={sendWhatsApp}>
        {t('login.feedbackWhatsApp')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 10, paddingBottom: 16},
  title: {fontSize: 16, fontWeight: '700', color: '#1A202C'},
  hint: {fontSize: 13, color: '#718096'},
  err: {fontSize: 13, color: '#E53E3E'},
});
