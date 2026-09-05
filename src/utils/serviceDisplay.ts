import i18n from '../i18n';
import type {AppLang} from '../services/serviceCatalog';
import {
  bilingualProfessionLine,
  bilingualServiceNames,
  serviceDescription,
  servicePrimaryName,
} from '../services/serviceCatalog';

export function currentAppLang(): AppLang {
  return i18n.language?.startsWith('hi') ? 'hi' : 'en';
}

export function localizedServiceName(
  raw?: string | null,
  extras?: {nameHi?: string},
): string {
  return servicePrimaryName(raw, currentAppLang(), extras);
}

export function localizedServiceLine(
  raw?: string | null,
  extras?: {nameHi?: string},
): string {
  const lang = currentAppLang();
  const {primary, secondary} = bilingualServiceNames(raw, lang, extras);
  return secondary ? `${primary} / ${secondary}` : primary;
}

export function hindiFirstProfessionLine(
  raw?: string | null,
  extras?: {nameHi?: string},
): string {
  return bilingualProfessionLine(raw, extras);
}

export function localizedServiceDescription(
  raw?: string | null,
  extras?: {nameHi?: string; descriptionHi?: string},
): string {
  return serviceDescription(raw, currentAppLang(), extras);
}
