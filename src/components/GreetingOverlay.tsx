import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Button} from 'sapvt-ltd-app-packages';
import {completeGreeting} from '../services/api/greetingApi';
import {useGreetingStore} from '../store/greetingStore';
import useTranslation from '../hooks/useTranslation';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

const SEEN_KEY = 'akanso.greeting.seen.';

export function GreetingOverlay() {
  const {t} = useTranslation();
  const {currentUser, isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const config = useGreetingStore(s => s.config);
  const hydrate = useGreetingStore(s => s.hydrate);
  const setConfig = useGreetingStore(s => s.setConfig);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentUser?.id && !currentUser?._id) {
      setConfig(null);
      setShow(false);
      return;
    }
    let active = true;
    void hydrate().then(async () => {
      if (!active) return;
      const data = useGreetingStore.getState().config;
      if (!data || data.state !== 'LAUNCH') {
        setShow(false);
        return;
      }
      if (data.closeMode === 'PER_PERSON') {
        const seen = await AsyncStorage.getItem(SEEN_KEY + data.waveId);
        if (seen) {
          setShow(false);
          return;
        }
      }
      setShow(true);
    });
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?._id, hydrate, setConfig]);

  if (!show || !config) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, {backgroundColor: theme.card}]}>
          <Text style={[styles.title, {color: theme.text}]}>
            {config.greeting}
          </Text>
          {config.message ? (
            <Text style={[styles.msg, {color: theme.textSecondary}]}>
              {config.message}
            </Text>
          ) : null}
          <Button
            variant="primary"
            block
            title={String(t('greeting.continue'))}
            loading={busy}
            onPress={() => {
              setBusy(true);
              void (async () => {
                try {
                  if (config.closeMode === 'PER_PERSON') {
                    await AsyncStorage.setItem(SEEN_KEY + config.waveId, '1');
                  }
                  await completeGreeting();
                } catch {
                  // Continue anyway — greeting must not trap the user.
                }
                setShow(false);
                setBusy(false);
              })();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,28,46,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {borderRadius: 16, padding: 20, gap: 12},
  title: {fontSize: 22, fontWeight: '700'},
  msg: {fontSize: 15, lineHeight: 22},
});
