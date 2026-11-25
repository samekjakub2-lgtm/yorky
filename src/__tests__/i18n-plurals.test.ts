import { createInstance } from 'i18next';

import { resources } from '@/locales';

async function makeT(lng: 'sk' | 'cs') {
  const instance = createInstance();
  await instance.init({ resources, lng, defaultNS: 'common' });
  return instance.getFixedT(lng, 'discovery');
}

describe('slovenské a české plurály', () => {
  it.each([
    ['sk', 1, '1 človek v okolí'],
    ['sk', 3, '3 ľudia v okolí'],
    ['sk', 7, '7 ľudí v okolí'],
    ['cs', 1, '1 člověk poblíž'],
    ['cs', 4, '4 lidé poblíž'],
    ['cs', 12, '12 lidí poblíž'],
  ] as const)('%s, %d → %s', async (lng, count, expected) => {
    const t = await makeT(lng);
    expect(t('peopleNearby', { count })).toBe(expected);
  });
});
