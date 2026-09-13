/**
 * Phone-alert opt-in after this-session login — web `PushEnablePrompt` parity.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ConfirmDialog} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import notificationService from '../services/notificationService';
import useTranslation from '../hooks/useTranslation';
import {
  markPushEnablePromptSeen,
  shouldOfferPushEnablePrompt,
} from '../utils/pushEnablePrompt';

export function PushEnablePrompt() {
  const {t} = useTranslation();
  const currentUser = useStore(s => s.currentUser);
  const userId = String(currentUser?.id || currentUser?._id || '');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const prevUserId = useRef<string | null | undefined>(undefined);

  const tryOpen = useCallback(async () => {
    if (!userId) return;
    if (!(await shouldOfferPushEnablePrompt())) return;
    setOpen(true);
  }, [userId]);

  useEffect(() => {
    const prev = prevUserId.current;
    prevUserId.current = userId || null;
    if (!userId) return;
    // First paint with an existing session is "landing", not login.
    if (prev === undefined) return;
    if (!prev) void tryOpen();
  }, [userId, tryOpen]);

  const close = (remember: boolean) => {
    setOpen(false);
    if (remember) void markPushEnablePromptSeen();
  };

  const onEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await notificationService.initializeAndSaveToken();
    } finally {
      setBusy(false);
      close(true);
    }
  };

  if (!open) return null;

  return (
    <ConfirmDialog
      visible
      title={String(t('notifications.installPromptTitle'))}
      message={String(t('notifications.installPromptBody'))}
      confirmText={String(t('notifications.settingsEnable'))}
      cancelText={String(t('notifications.installPromptLater'))}
      onCancel={() => close(true)}
      onConfirm={() => void onEnable()}
    />
  );
}
