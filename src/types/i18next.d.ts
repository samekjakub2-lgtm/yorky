import type { DEFAULT_NAMESPACE, resources } from '@/locales';

// Typovo kontrolované kľúče prekladov: t('discovery:title') musí existovať v sk.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: (typeof resources)['sk'];
  }
}
