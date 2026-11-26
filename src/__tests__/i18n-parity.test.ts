import { describe, expect, it } from 'vitest';

import cs from '../../messages/cs.json';
import sk from '../../messages/sk.json';

/** Pravidlo 3: každý kľúč musí existovať v sk aj cs. */
function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, child]) => ({ ...acc, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

const skFlat = flatten(sk);
const csFlat = flatten(cs);

describe('preklady sk/cs', () => {
  it('majú rovnaké kľúče', () => {
    expect(Object.keys(csFlat).sort()).toEqual(Object.keys(skFlat).sort());
  });

  it('žiadny preklad nie je prázdny', () => {
    for (const [key, value] of Object.entries({ ...skFlat, ...csFlat })) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('plurály majú tvary one, few aj other', () => {
    for (const [key, value] of Object.entries({ ...skFlat, ...csFlat })) {
      if (!value.includes(', plural,')) continue;
      for (const form of ['one {', 'few {', 'other {']) {
        expect(value, `${key}: ${form}`).toContain(form);
      }
    }
  });

  it('rovnaké premenné v sk aj cs', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)[},]/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(skFlat)) {
      expect(vars(csFlat[key] ?? ''), key).toEqual(vars(skFlat[key] ?? ''));
    }
  });
});
