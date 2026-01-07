import {useTranslation as useI18nTranslation} from 'react-i18next';

/**
 * Custom hook for translations
 * Wraps react-i18next's useTranslation hook for easier usage
 */
const useTranslation = () => {
  const {t, i18n} = useI18nTranslation();

  return {
    t,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
};

export default useTranslation;
