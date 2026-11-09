import React, {useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {isCustomerProfileIncomplete} from 'sapvt-ltd-app-packages';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {consumeProfileCompletionPrompt} from '../utils/profileCompletionPrompt';
import useTranslation from '../hooks/useTranslation';

export function ProfileCompletionPrompt() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const currentUser = useStore(s => s.currentUser);
  const isDarkMode = useStore(s => s.isDarkMode);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!currentUser?.id && !currentUser?._id) return;
    if (!consumeProfileCompletionPrompt()) return;
    if (!isCustomerProfileIncomplete(currentUser)) return;
    setOpen(true);
  }, [currentUser]);

  const close = () => setOpen(false);

  const goUpdate = () => {
    setOpen(false);
    navigation.navigate('Settings', {
      screen: 'SettingsMain',
      params: {editProfile: true},
    });
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable
          style={[styles.card, {backgroundColor: theme.card}]}
          onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: theme.text}]}>
              {String(t('profile.completionTitle'))}
            </Text>
            <TouchableOpacity
              onPress={close}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={String(t('common.close') || 'Close')}>
              <Icon name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.message, {color: theme.textSecondary}]}>
            {String(t('profile.completionMessage'))}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, {backgroundColor: theme.primary}]}
            onPress={goUpdate}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={String(t('profile.completionUpdate'))}>
            <Text style={styles.primaryText}>
              {String(t('profile.completionUpdate'))}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              {borderColor: theme.border, backgroundColor: theme.background},
            ]}
            onPress={close}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={String(t('profile.completionLater'))}>
            <Text style={[styles.secondaryText, {color: theme.text}]}>
              {String(t('profile.completionLater'))}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
