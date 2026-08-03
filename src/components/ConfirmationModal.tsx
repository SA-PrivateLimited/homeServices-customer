import React from 'react';
import {
  ConfirmationModal as PackageConfirmationModal,
  type ConfirmationModalProps,
} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';

const ConfirmationModal: React.FC<ConfirmationModalProps> = props => {
  const {t} = useTranslation();
  return (
    <PackageConfirmationModal
      {...props}
      confirmText={props.confirmText || t('common.confirm') || 'Confirm'}
      cancelText={props.cancelText || t('common.cancel') || 'Cancel'}
    />
  );
};

export default ConfirmationModal;
