/**
 * Push notification preference card — web `NotificationsSettingsCard` parity.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {PermissionsAndroid, Platform, StyleSheet, Text, View} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {Button} from 'sapvt-ltd-app-packages';
import notificationService from '../services/notificationService';
import type {Theme} from '../utils/theme';
import {CrystalSurface} from './CrystalSurface';

type PushState = 'loading' | 'granted' | 'denied' | 'default';

type Props = {
  theme: Theme;
  title: string;
  body: string;
  enableLabel: string;
  onLabel: string;
  offLabel: string;
  blockedLabel: string;
};

async function readPushState(): Promise<PushState> {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted ? 'granted' : 'default';
    }
    const status = await messaging().hasPermission();
    if (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      return 'granted';
    }
    if (status === messaging.AuthorizationStatus.DENIED) return 'denied';
    return 'default';
  } catch {
    return 'default';
  }
}

export function NotificationsSettingsCard({
  theme,
  title,
  body,
  enableLabel,
  onLabel,
  offLabel,
  blockedLabel,
}: Props) {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setState(await readPushState());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === 'loading') return null;

  const isDark = String(theme.background || '').toLowerCase() === '#0b1220';

  return (
    <CrystalSurface
      primary={theme.primary}
      card={theme.card}
      isDark={isDark}
      style={styles.wrap}
      contentStyle={styles.card}>
      <Text style={[styles.strong, {color: theme.text}]}>{title}</Text>
      <Text style={[styles.p, {color: theme.textSecondary}]}>{body}</Text>
      <Text
        style={[
          styles.status,
          {
            color:
              state === 'granted'
                ? theme.success
                : state === 'denied'
                  ? theme.error
                  : theme.warning,
          },
        ]}>
        {state === 'granted'
          ? onLabel
          : state === 'denied'
            ? blockedLabel
            : offLabel}
      </Text>
      {state !== 'granted' && state !== 'denied' ? (
        <Button
          variant="primary"
          title={enableLabel}
          loading={busy}
          onPress={() => {
            setBusy(true);
            void (async () => {
              try {
                if (Platform.OS === 'android') {
                  await notificationService.requestAndroidNotificationPermission();
                }
                await messaging().requestPermission();
                await notificationService.initializeAndSaveToken();
              } finally {
                await refresh();
                setBusy(false);
              }
            })();
          }}
        />
      ) : null}
    </CrystalSurface>
  );
}

const styles = StyleSheet.create({
  wrap: {marginHorizontal: 16, marginBottom: 10, elevation: 0, shadowOpacity: 0},
  card: {paddingVertical: 14, paddingHorizontal: 16, gap: 8},
  strong: {fontSize: 15, fontWeight: '700'},
  p: {fontSize: 13, lineHeight: 18},
  status: {fontSize: 13, fontWeight: '600'},
});
