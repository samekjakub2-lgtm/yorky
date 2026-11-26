export const locales = ['sk', 'cs'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'sk';
/** Cookie s jazykom, ktorý si používateľ zvolil. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

/** Vyberie podporovaný jazyk z hlavičky Accept-Language (napr. "cs-CZ,cs;q=0.9,en;q=0.8"). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) {
    if (isLocale(lang)) return lang;
  }
  return null;
}
