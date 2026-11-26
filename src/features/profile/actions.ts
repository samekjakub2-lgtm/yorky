'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import {
  CreateProfileSchema,
  MAX_PHOTOS,
  PhotoPathSchema,
  ProfileDetailsSchema,
} from '@/features/profile/schemas';
import { type ActionResult, fail, fromDbError, ok, UuidSchema } from '@/lib/action-result';
import { createClient, getUserId } from '@/lib/supabase/server';

const PROFILE_PHOTOS_BUCKET = 'profile-photos';

const ProfileUpdateSchema = ProfileDetailsSchema.extend({
  hide_distance: z.boolean(),
  is_incognito: z.boolean(), // server overí prémium (trigger enforce_premium_features)
  locale: z.enum(['sk', 'cs']),
}).partial();

/** Onboarding: vytvorí profil (meno, dátum narodenia). Vek 18+ overí aj DB trigger. */
export async function createMyProfile(input: unknown): Promise<ActionResult> {
  const parsed = CreateProfileSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');

  const supabase = await createClient();
  const locale = await getLocale();
  const { error } = await supabase.from('profiles').insert({ id: userId, ...parsed.data, locale });
  // 23505 = profil už existuje (napr. dvojklik) – pokračuj ďalej.
  if (error && error.code !== '23505') return fail(fromDbError(error));
  redirect('/profile');
}

export async function updateMyProfile(input: unknown): Promise<ActionResult> {
  const parsed = ProfileUpdateSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', userId);
  if (error) return fail(fromDbError(error));
  revalidatePath('/profile');
  return ok(undefined);
}

/**
 * Zaeviduje fotku, ktorú klient už nahral do Storage (vyčistenú od EXIF).
 * Pozíciu vyberá server – prvé voľné miesto 0–5.
 */
export async function addMyPhoto(input: unknown): Promise<ActionResult> {
  const parsed = PhotoPathSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');
  if (!parsed.data.startsWith(`${userId}/`)) return fail('not_allowed');

  const supabase = await createClient();
  const { data: photos, error: listError } = await supabase
    .from('profile_photos')
    .select('position')
    .eq('user_id', userId);
  if (listError) return fail(fromDbError(listError));

  const taken = new Set(photos.map((p) => p.position));
  const position = Array.from({ length: MAX_PHOTOS }, (_, i) => i).find((i) => !taken.has(i));
  if (position === undefined) return fail('invalid_input');

  const { error } = await supabase
    .from('profile_photos')
    .insert({ user_id: userId, storage_path: parsed.data, position });
  if (error) return fail(fromDbError(error));
  return ok(undefined);
}

/** Zmaže vlastnú fotku – riadok aj súbor v Storage. */
export async function deleteMyPhoto(input: unknown): Promise<ActionResult> {
  const parsed = UuidSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');

  const supabase = await createClient();
  const { data: photo, error } = await supabase
    .from('profile_photos')
    .delete()
    .eq('id', parsed.data)
    .eq('user_id', userId)
    .select('storage_path')
    .maybeSingle();
  if (error) return fail(fromDbError(error));
  if (!photo) return fail('not_allowed');

  // Súbor zmažeme až po riadku – osirelý súbor (ak by to zlyhalo) zmaže delete-account.
  await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([photo.storage_path]);
  return ok(undefined);
}

/** Úplné zmazanie účtu cez Edge Function (fotky, dáta, Stripe predplatné). */
export async function deleteMyAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return fail('generic');
  await supabase.auth.signOut();
  redirect('/sign-in');
}
