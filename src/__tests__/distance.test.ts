import { createInstance } from 'i18next';

import { formatDistanceBucket } from '@/features/discovery/distance';
import { coarsenCoordinate } from '@/features/discovery/location';
import { resources } from '@/locales';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-location', () => ({}));

describe('formatDistanceBucket', () => {
  let t: Parameters<typeof formatDistanceBucket>[0];

  beforeAll(async () => {
    const instance = createInstance();
    await instance.init({ resources, lng: 'sk', defaultNS: 'common' });
    t = instance.getFixedT('sk', 'discovery');
  });

  it('pásmo 0 = < 1 km', () => expect(formatDistanceBucket(t, 0)).toBe('< 1 km'));
  it('celé km', () => expect(formatDistanceBucket(t, 7)).toBe('7 km'));
  it('skrytá vzdialenosť', () => expect(formatDistanceBucket(t, null)).toBe('Vzdialenosť skrytá'));
});

describe('coarsenCoordinate', () => {
  it('zaokrúhli na 3 desatinné miesta pred odoslaním', () => {
    expect(coarsenCoordinate(48.148612345)).toBe(48.149);
    expect(coarsenCoordinate(17.107712345)).toBe(17.108);
  });
});
