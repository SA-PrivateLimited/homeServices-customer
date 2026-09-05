import React, {useEffect, useRef, useState} from 'react';
import {ConfirmDialog} from 'sapvt-ltd-app-packages';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '../store';
import {customerProfileCompletionPercent} from '../utils/profileCompletion';
import useTranslation from '../hooks/useTranslation';

/** One nudge per process, matching web sessionStorage. */
let promptedThisSession = false;

export function ProfileCompletionPrompt() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const currentUser = useStore(s => s.currentUser);
  const [open, setOpen] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    if (!currentUser?.id && !currentUser?._id) return;
    if (promptedThisSession || shown.current) return;
    const pct = customerProfileCompletionPercent(currentUser);
    if (pct >= 100) return;
    promptedThisSession = true;
    shown.current = true;
    setOpen(true);
  }, [currentUser]);

  return (
    <ConfirmDialog
      visible={open}
      title={String(t('profile.completionTitle'))}
      message={String(t('profile.completionMessage'))}
      confirmText={String(t('profile.completionUpdate'))}
      cancelText={String(t('profile.completionLater'))}
      onCancel={() => setOpen(false)}
      onConfirm={() => {
        setOpen(false);
        navigation.navigate('Settings', {screen: 'Profile'});
      }}
    />
  );
}
