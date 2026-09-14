import React, {useEffect, useRef, useState} from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {darkTheme, lightTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {
  registerLocationConsentPresenter,
  type LocationConsentResult,
} from '../services/locationConsentBridge';

/**
 * Host for the themed "Use your location" explanation.
 * Registers with locationConsentBridge so geolocationService can await consent
 * before the native Android permission dialog.
 */
export function LocationPermissionExplanationHost() {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<((value: LocationConsentResult) => void) | null>(
    null,
  );

  useEffect(() => {
    registerLocationConsentPresenter(
      () =>
        new Promise<LocationConsentResult>(resolve => {
          resolverRef.current = resolve;
          setVisible(true);
        }),
    );
    return () => {
      registerLocationConsentPresenter(null);
      if (resolverRef.current) {
        resolverRef.current('not_now');
        resolverRef.current = null;
      }
    };
  }, []);

  const finish = (result: LocationConsentResult) => {
    setVisible(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  };

  const title = String(
    t('ecosystem.allowLocationTitle') || 'Use your location',
  );
  const body = String(
    t('ecosystem.allowLocationMessage') ||
      'Akansho uses your location to find nearby service professionals.',
  );
  const allowLabel = String(t('ecosystem.allowLocation') || 'Allow');
  const notNowLabel = String(t('ecosystem.notNow') || 'Not now');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => finish('not_now')}>
      <View style={styles.overlay}>
        <View style={[styles.card, {backgroundColor: theme.card}]}>
          <View
            style={[
              styles.iconWrap,
              {backgroundColor: `${theme.primary}18`},
            ]}>
            <Icon name="my-location" size={22} color={theme.primary} />
          </View>
          <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
          <Text style={[styles.body, {color: theme.textSecondary}]}>
            {body}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              onPress={() => finish('not_now')}
              accessibilityRole="button"
              accessibilityLabel={notNowLabel}>
              <Text style={[styles.secondaryLabel, {color: theme.text}]}>
                {notNowLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, {backgroundColor: theme.primary}]}
              onPress={() => finish('allow')}
              accessibilityRole="button"
              accessibilityLabel={allowLabel}>
              <Text style={styles.primaryLabel}>{allowLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const {width} = Dimensions.get('window');
const modalWidth = Math.min(width * 0.86, 360);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: modalWidth,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default LocationPermissionExplanationHost;
