import { describe, expect, it } from 'vitest';

import {
  CreateProfileSchema,
  isAdult,
  latestAdultBirthDate,
  PhotoPathSchema,
  ProfileDetailsSchema,
} from '@/features/profile/schemas';

const TODAY = new Date('2026-11-26T12:00:00Z');

describe('isAdult', () => {
  it('presne 18 rokov dnes → áno', () => expect(isAdult('2008-11-26', TODAY)).toBe(true));
  it('18 rokov až zajtra → nie', () => expect(isAdult('2008-11-27', TODAY)).toBe(false));
  it('29. február', () =>
    expect(latestAdultBirthDate(new Date('2026-02-28T00:00:00Z'))).toBe('2008-02-28'));
});

describe('CreateProfileSchema', () => {
  it('orezá meno a prijme dospelého', () => {
    const parsed = CreateProfileSchema.parse({
      display_name: '  Tomáš ',
      birth_date: '1995-04-02',
    });
    expect(parsed.display_name).toBe('Tomáš');
  });
  it('odmietne neplnoletého', () =>
    expect(
      CreateProfileSchema.safeParse({ display_name: 'A', birth_date: '2020-01-01' }).success,
    ).toBe(false));
  it('odmietne prázdne meno a neplatný dátum', () => {
    expect(
      CreateProfileSchema.safeParse({ display_name: ' ', birth_date: '1990-01-01' }).success,
    ).toBe(false);
    expect(
      CreateProfileSchema.safeParse({ display_name: 'A', birth_date: '1990-13-01' }).success,
    ).toBe(false);
  });
});

describe('ProfileDetailsSchema', () => {
  it('prázdne bio → null', () =>
    expect(
      ProfileDetailsSchema.parse({ display_name: 'A', bio: '  ', height_cm: null }).bio,
    ).toBeNull());
  it('výška mimo rozsahu', () =>
    expect(
      ProfileDetailsSchema.safeParse({ display_name: 'A', bio: '', height_cm: 300 }).success,
    ).toBe(false));
});

describe('PhotoPathSchema', () => {
  const uuid = '3f2b8c1e-5d4a-4e7b-9c1d-2a3b4c5d6e7f';
  it('platná cesta', () =>
    expect(PhotoPathSchema.safeParse(`${uuid}/${uuid}.jpg`).success).toBe(true));
  it('odmietne traversal a iné prípony', () => {
    expect(PhotoPathSchema.safeParse(`../${uuid}.jpg`).success).toBe(false);
    expect(PhotoPathSchema.safeParse(`${uuid}/${uuid}.png`).success).toBe(false);
  });
});
