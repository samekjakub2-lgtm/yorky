import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_NAMESPACE,
  FALLBACK_LANGUAGE,
  resources,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/locales';

function isSupported(code: string | null | undefined): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage);
}

/** Jazyk zariadenia, ak ho podporujeme; inak slovenčina. */
export function detectLanguage(): SupportedLanguage {
  for (const locale of getLocales()) {
    if (isSupported(locale.languageCode)) return locale.languageCode;
  }
  return FALLBACK_LANGUAGE;
}

export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  defaultNS: DEFAULT_NAMESPACE,
  ns: Object.keys(resources.sk),
  interpolation: { escapeValue: false }, // React escapuje sám
  returnNull: false,
});
