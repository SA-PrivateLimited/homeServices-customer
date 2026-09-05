/**
 * Share Akanso — web `ShareAkansoPanel` parity (WhatsApp / copy / system share / QR).
 */

import React, {useMemo, useState} from 'react';
import {
  Linking,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import {useStore} from '../../store';
import {lightTheme, darkTheme} from '../../utils/theme';
import useTranslation from '../../hooks/useTranslation';

const DEFAULT_SHARE_URL = 'https://akanso.in';

type Props = {
  url?: string;
  compact?: boolean;
};

export function ShareAkansoPanel({url, compact = false}: Props) {
  const {isDarkMode, language} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const shareUrl = url || DEFAULT_SHARE_URL;
  const isHi = String(language || '').startsWith('hi');
  const [showQr, setShowQr] = useState(!compact);
  const qrSize = compact ? 140 : 180;

  const shareText = useMemo(() => {
    const key = isHi ? 'ecosystem.shareMessageHi' : 'ecosystem.shareMessageEn';
    const raw = String(t(key) || '');
    if (raw && !raw.startsWith('ecosystem.')) {
      return raw.replace('{{url}}', shareUrl);
    }
    return isHi
      ? `भरोसेमंद घरेलू सेवाओं के लिए Akanso आज़माएँ: ${shareUrl}`
      : `Try Akanso for trusted home services near you: ${shareUrl}`;
  }, [isHi, shareUrl, t]);

  const onCopy = () => {
    void Share.share({message: shareUrl, title: shareUrl});
  };

  const onWhatsApp = () => {
    const wa = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    void Linking.openURL(wa);
  };

  const onNativeShare = async () => {
    try {
      await Share.share({
        title: String(t('ecosystem.shareTitle') || 'Share Akanso'),
        message: shareText,
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.compact,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
      accessibilityLabel={String(t('ecosystem.shareTitle') || 'Share Akanso')}>
      <Text style={[styles.title, {color: theme.text}]}>
        {t('ecosystem.shareTitle') || 'Share Akanso'}
      </Text>
      <Text style={[styles.lead, {color: theme.textSecondary}]}>
        {t('ecosystem.shareLead') ||
          'Invite friends and family to book trusted home services.'}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, {borderColor: theme.border}]}
          onPress={onWhatsApp}
          accessibilityRole="button">
          <Icon name="chat" size={16} color={theme.primary} />
          <Text style={[styles.btnText, {color: theme.text}]}>
            {t('ecosystem.shareWhatsApp') || 'WhatsApp'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, {borderColor: theme.border}]}
          onPress={onCopy}
          accessibilityRole="button">
          <Icon name="content-copy" size={16} color={theme.primary} />
          <Text style={[styles.btnText, {color: theme.text}]}>
            {t('ecosystem.copyLink') || 'Copy link'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, {borderColor: theme.border}]}
          onPress={() => void onNativeShare()}
          accessibilityRole="button">
          <Icon name="share" size={16} color={theme.primary} />
          <Text style={[styles.btnText, {color: theme.text}]}>
            {t('ecosystem.shareNative') || 'Share'}
          </Text>
        </TouchableOpacity>
        {compact ? (
          <TouchableOpacity
            style={[styles.btn, {borderColor: theme.border}]}
            onPress={() => setShowQr(v => !v)}
            accessibilityRole="button"
            accessibilityState={{expanded: showQr}}>
            <Icon name="qr-code" size={16} color={theme.primary} />
            <Text style={[styles.btnText, {color: theme.text}]}>
              {showQr
                ? t('ecosystem.hideQr') || 'Hide QR'
                : t('ecosystem.showQr') || 'QR code'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {showQr ? (
        <View
          style={styles.qrBlock}
          accessibilityLabel={String(t('ecosystem.qrAlt') || 'QR code')}>
          <View style={[styles.qrFrame, {borderColor: theme.border}]}>
            <QRCode
              value={shareUrl}
              size={qrSize}
              backgroundColor="#FFFFFF"
              color="#0F1C2E"
              ecl="M"
            />
          </View>
          <Text style={[styles.qrCaption, {color: theme.textSecondary}]}>
            {t('ecosystem.qrCaption') || 'Scan with your phone to open Akanso'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compact: {paddingVertical: 12},
  title: {fontSize: 15, fontWeight: '700', marginBottom: 4},
  lead: {fontSize: 13, lineHeight: 18, marginBottom: 10},
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    // Web `.share-akanso__actions .hs-btn`: flex 1 + min-width ~50% → 2-col grid
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '46%',
    minWidth: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnText: {fontSize: 13, fontWeight: '600', flexShrink: 1},
  qrBlock: {
    marginTop: 14,
    alignItems: 'center',
  },
  qrFrame: {
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#FFFFFF',
  },
  qrCaption: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 220,
  },
});
