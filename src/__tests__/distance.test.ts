import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { formatDistanceBucket } from '@/features/discovery/distance';
import { coarsenCoordinate } from '@/lib/platform/geolocation';

import sk from '../../messages/sk.json';

const t = createTranslator({ locale: 'sk', messages: sk, namespace: 'discovery' });

describe('formatDistanceBucket', () => {
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
