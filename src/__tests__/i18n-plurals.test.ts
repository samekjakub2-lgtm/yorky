import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

import cs from '../../messages/cs.json';
import sk from '../../messages/sk.json';

describe('slovenské a české plurály', () => {
  it.each([
    ['sk', 1, '1 človek v okolí'],
    ['sk', 3, '3 ľudia v okolí'],
    ['sk', 7, '7 ľudí v okolí'],
    ['cs', 1, '1 člověk poblíž'],
    ['cs', 4, '4 lidé poblíž'],
    ['cs', 12, '12 lidí poblíž'],
  ] as const)('%s, %d → %s', (locale, count, expected) => {
    const t = createTranslator({
      locale,
      messages: locale === 'sk' ? sk : cs,
      namespace: 'discovery',
    });
    expect(t('peopleNearby', { count })).toBe(expected);
  });

  it('vek: 5 rokov / 5 let', () => {
    expect(
      createTranslator({ locale: 'sk', messages: sk, namespace: 'profile' })('age', { count: 5 }),
    ).toBe('5 rokov');
    expect(
      createTranslator({ locale: 'cs', messages: cs, namespace: 'profile' })('age', { count: 5 }),
    ).toBe('5 let');
  });

  it.each([
    ['sk', 1, '1 neprečítaná správa'],
    ['sk', 3, '3 neprečítané správy'],
    ['sk', 5, '5 neprečítaných správ'],
    ['cs', 1, '1 nepřečtená zpráva'],
    ['cs', 2, '2 nepřečtené zprávy'],
    ['cs', 9, '9 nepřečtených zpráv'],
  ] as const)('neprečítané %s, %d → %s', (locale, count, expected) => {
    const t = createTranslator({ locale, messages: locale === 'sk' ? sk : cs, namespace: 'chat' });
    expect(t('unread', { count })).toBe(expected);
  });
});
