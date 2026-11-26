import { z } from 'zod';

export const MAX_PHOTOS = 6; // profile_photos.position je 0–5
export const MIN_AGE = 18;

/** Najneskorší povolený dátum narodenia (YYYY-MM-DD) pre vek MIN_AGE k dátumu `today` (UTC). */
export function latestAdultBirthDate(today: Date = new Date()): string {
  const limit = new Date(
    Date.UTC(today.getUTCFullYear() - MIN_AGE, today.getUTCMonth(), today.getUTCDate()),
  );
  return limit.toISOString().slice(0, 10);
}

/** Je osoba narodená `birthDate` (YYYY-MM-DD) k dátumu `today` plnoletá? Server to overí znova (trigger). */
export function isAdult(birthDate: string, today: Date = new Date()): boolean {
  return birthDate <= latestAdultBirthDate(today);
}

const IsoDateSchema = z.iso.date();

export const DisplayNameSchema = z.string().trim().min(1).max(30);

export const CreateProfileSchema = z.object({
  display_name: DisplayNameSchema,
  birth_date: IsoDateSchema.refine((value) => isAdult(value), { message: 'too_young' }).refine(
    (value) => value >= '1900-01-01',
    { message: 'invalid_date' },
  ),
});

export const ProfileDetailsSchema = z.object({
  display_name: DisplayNameSchema,
  bio: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === '' ? null : value)),
  height_cm: z.number().int().min(120).max(230).nullable(),
});

/** Cesta fotky v bucketi: "<user_id>/<uuid>.jpg". */
export const PhotoPathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
