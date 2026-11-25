import { resources } from '@/locales';

/** Pravidlo 3: každý kľúč musí existovať v sk aj cs. */
function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

describe('i18n', () => {
  const namespaces = Object.keys(resources.sk) as (keyof typeof resources.sk)[];

  it('sk a cs majú rovnaké namespaces', () => {
    expect(Object.keys(resources.cs).sort()).toEqual([...namespaces].sort());
  });

  it.each(namespaces)('namespace "%s" má rovnaké kľúče v sk aj cs', (ns) => {
    expect(flattenKeys(resources.cs[ns]).sort()).toEqual(flattenKeys(resources.sk[ns]).sort());
  });

  it.each(namespaces)('plurály v "%s" majú tvary _one, _few aj _other', (ns) => {
    for (const lang of ['sk', 'cs'] as const) {
      const keys = flattenKeys(resources[lang][ns]);
      const pluralBases = new Set(
        keys.filter((k) => PLURAL_SUFFIX.test(k)).map((k) => k.replace(PLURAL_SUFFIX, '')),
      );
      for (const base of pluralBases) {
        for (const form of ['one', 'few', 'other']) {
          expect(keys).toContain(`${base}_${form}`);
        }
      }
    }
  });

  it('žiadny preklad nie je prázdny', () => {
    for (const lang of ['sk', 'cs'] as const) {
      for (const ns of namespaces) {
        const walk = (value: unknown): void => {
          if (typeof value === 'string') expect(value.trim()).not.toBe('');
          else if (value && typeof value === 'object') Object.values(value).forEach(walk);
        };
        walk(resources[lang][ns]);
      }
    }
  });
});
