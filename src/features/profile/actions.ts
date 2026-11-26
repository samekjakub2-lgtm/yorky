'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { type ActionResult, fail, fromDbError, ok } from '@/lib/action-result';
import { createClient, getUserId } from '@/lib/supabase/server';

const ProfileUpdateSchema = z
  .object({
    display_name: z.string().trim().min(1).max(30),
    bio: z.string().trim().max(500).nullable(),
    height_cm: z.number().int().min(120).max(230).nullable(),
    hide_distance: z.boolean(),
    is_incognito: z.boolean(), // server overí prémium (trigger enforce_premium_features)
    locale: z.enum(['sk', 'cs']),
  })
  .partial();

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

/** Úplné zmazanie účtu cez Edge Function (fotky, dáta, Stripe predplatné). */
export async function deleteMyAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return fail('generic');
  await supabase.auth.signOut();
  redirect('/sign-in');
}
