import React from 'react';
import {Text} from 'react-native';
import useTranslation from '../../hooks/useTranslation';
import {loginFromWeb as s} from '../../fromWebCss/loginFromWeb.styles';

type Props = {
  onTerms: () => void;
  onPrivacy: () => void;
};

export function LoginTermsMini({onTerms, onPrivacy}: Props) {
  const {t} = useTranslation();
  const raw = String(t('login.termsHint'));
  const parts = raw.split(/<\/?terms>|<\/?privacy>/);

  if (parts.length < 5) {
    return <Text style={s.extrasTerms}>{raw.replace(/<[^>]+>/g, '')}</Text>;
  }

  return (
    <Text style={s.extrasTerms}>
      {parts[0]}
      <Text style={s.extrasTermsLink} onPress={onTerms}>
        {parts[1]}
      </Text>
      {parts[2]}
      <Text style={s.extrasTermsLink} onPress={onPrivacy}>
        {parts[3]}
      </Text>
      {parts[4]}
    </Text>
  );
}
