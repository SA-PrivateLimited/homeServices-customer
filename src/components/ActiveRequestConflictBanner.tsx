import React from 'react';
import {ConfirmDialog} from 'sapvt-ltd-app-packages';
import type {ActiveServiceRequestSummary} from '../services/api/serviceRequestsApi';
import {
  activeRequestDescription,
  activeRequestViewAction,
} from '../utils/activeRequestUx';
import useTranslation from '../hooks/useTranslation';

type Props = {
  active: ActiveServiceRequestSummary;
  onDismiss?: () => void;
  onView: (action: ReturnType<typeof activeRequestViewAction>) => void;
};

export function ActiveRequestConflictBanner({
  active,
  onDismiss,
  onView,
}: Props) {
  const {t} = useTranslation();
  const action = activeRequestViewAction(active);

  return (
    <ConfirmDialog
      visible
      type="info"
      title={String(t('activeRequest.title'))}
      message={activeRequestDescription(active)}
      confirmText={String(t(action.labelKey))}
      cancelText={String(t('common.cancel'))}
      onConfirm={() => onView(action)}
      onCancel={() => onDismiss?.()}
    />
  );
}
