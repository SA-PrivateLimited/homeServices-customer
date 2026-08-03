import React from 'react';
import {AlertModal as PackageAlertModal, type AlertModalProps} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';

/**
 * App wrapper: package UI + i18n default button label.
 */
const AlertModal: React.FC<AlertModalProps> = props => {
  const {t} = useTranslation();
  return (
    <PackageAlertModal
      {...props}
      buttonText={props.buttonText || t('common.ok') || 'OK'}
    />
  );
};

export default AlertModal;
