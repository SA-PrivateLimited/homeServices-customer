import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enSettings from './locales/en/settings.json';
import enServices from './locales/en/services.json';
import enServiceHistory from './locales/en/serviceHistory.json';
import enActiveService from './locales/en/activeService.json';
import enServiceRequest from './locales/en/serviceRequest.json';
import enProfile from './locales/en/profile.json';
import enHome from './locales/en/home.json';
import enJobCard from './locales/en/jobCard.json';
import enErrors from './locales/en/errors.json';
import enMessages from './locales/en/messages.json';
import enNotifications from './locales/en/notifications.json';
import enProviders from './locales/en/providers.json';
import enRecommendations from './locales/en/recommendations.json';

// Hindi translations
import hiCommon from './locales/hi/common.json';
import hiAuth from './locales/hi/auth.json';
import hiSettings from './locales/hi/settings.json';
import hiServices from './locales/hi/services.json';
import hiServiceHistory from './locales/hi/serviceHistory.json';
import hiActiveService from './locales/hi/activeService.json';
import hiServiceRequest from './locales/hi/serviceRequest.json';
import hiProfile from './locales/hi/profile.json';
import hiHome from './locales/hi/home.json';
import hiJobCard from './locales/hi/jobCard.json';
import hiErrors from './locales/hi/errors.json';
import hiMessages from './locales/hi/messages.json';
import hiNotifications from './locales/hi/notifications.json';
import hiProviders from './locales/hi/providers.json';
import hiRecommendations from './locales/hi/recommendations.json';

// Merge all translations
const en = {
  common: enCommon,
  auth: enAuth,
  settings: enSettings,
  services: enServices,
  serviceHistory: enServiceHistory,
  activeService: enActiveService,
  serviceRequest: enServiceRequest,
  profile: enProfile,
  home: enHome,
  jobCard: enJobCard,
  errors: enErrors,
  messages: enMessages,
  notifications: enNotifications,
  providers: enProviders,
  recommendations: enRecommendations,
};

const hi = {
  common: hiCommon,
  auth: hiAuth,
  settings: hiSettings,
  services: hiServices,
  serviceHistory: hiServiceHistory,
  activeService: hiActiveService,
  serviceRequest: hiServiceRequest,
  profile: hiProfile,
  home: hiHome,
  jobCard: hiJobCard,
  errors: hiErrors,
  messages: hiMessages,
  notifications: hiNotifications,
  providers: hiProviders,
  recommendations: hiRecommendations,
};

const LANGUAGE_KEY = '@app_language';

// Language detection
const getStoredLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return stored || 'en';
  } catch {
    return 'en';
  }
};

// Initialize i18n synchronously first, then update language from storage
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: {translation: en},
      hi: {translation: hi},
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Load stored language after initialization
getStoredLanguage().then(language => {
  i18n.changeLanguage(language);
});

// Change language
export const changeLanguage = async (language: 'en' | 'hi') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

export default i18n;
