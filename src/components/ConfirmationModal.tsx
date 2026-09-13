import React from 'react';
import {
  ConfirmationModal as PackageConfirmationModal,
  type ConfirmationModalProps,
} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';

type Props = ConfirmationModalProps & {icon?: string};

const ConfirmationModal: React.FC<Props> = ({icon, iconGlyph, ...props}) => {
  const {t} = useTranslation();
  return (
    <PackageConfirmationModal
      {...props}
      iconGlyph={iconGlyph || icon}
      confirmText={props.confirmText || t('common.confirm') || 'Confirm'}
      cancelText={props.cancelText || t('common.cancel') || 'Cancel'}
    />
  );
};

export default ConfirmationModal;
