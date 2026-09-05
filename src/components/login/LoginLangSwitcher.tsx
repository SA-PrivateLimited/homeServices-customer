import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {useStore} from '../../store';
import useTranslation from '../../hooks/useTranslation';
import {loginFromWeb as s} from '../../fromWebCss/loginFromWeb.styles';

export function LoginLangSwitcher() {
  const {language, setLanguage} = useStore();
  const {t} = useTranslation();
  const current = language || 'en';

  return (
    <View style={s.lang} accessibilityRole="tablist">
      <TouchableOpacity
        style={[s.langBtn, current === 'hi' && s.langBtnActive]}
        onPress={() => void setLanguage('hi')}
        accessibilityState={{selected: current === 'hi'}}>
        <Text style={[s.langBtnText, current === 'hi' && s.langBtnTextActive]}>
          {t('login.langHindi')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.langBtn, current === 'en' && s.langBtnActive]}
        onPress={() => void setLanguage('en')}
        accessibilityState={{selected: current === 'en'}}>
        <Text style={[s.langBtnText, current === 'en' && s.langBtnTextActive]}>
          {t('login.langEnglish')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
