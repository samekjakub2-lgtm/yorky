import type messages from '../messages/sk.json';
import type { Locale } from '@/i18n/config';

// Typovo kontrolované kľúče prekladov (zdroj pravdy: messages/sk.json).
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
