import { describe, expect, it } from 'vitest';

import { localeFromAcceptLanguage } from '@/i18n/config';

describe('localeFromAcceptLanguage', () => {
  it('čeština z cs-CZ', () =>
    expect(localeFromAcceptLanguage('cs-CZ,cs;q=0.9,en;q=0.8')).toBe('cs'));
  it('slovenčina má prednosť podľa q', () =>
    expect(localeFromAcceptLanguage('en;q=0.9,sk;q=0.8,cs;q=0.5')).toBe('sk'));
  it('nepodporovaný jazyk → null', () => expect(localeFromAcceptLanguage('de-DE,en')).toBeNull());
  it('prázdna hlavička → null', () => expect(localeFromAcceptLanguage(null)).toBeNull());
});
