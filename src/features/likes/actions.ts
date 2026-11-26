'use server';

import { type ActionResult, fail, fromDbError, ok, UuidSchema } from '@/lib/action-result';
import { createClient, getUserId } from '@/lib/supabase/server';

/** Lajkne profil. Vráti id matchu, ak bol like vzájomný, inak null. */
export async function likeProfile(otherUserId: unknown): Promise<ActionResult<string | null>> {
  const parsed = UuidSchema.safeParse(otherUserId);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('like_profile', { p_user_id: parsed.data });
  return error ? fail(fromDbError(error)) : ok(data ?? null);
}

/** Vezme like späť – server zruší aj prípadný match. */
export async function unlikeProfile(otherUserId: unknown): Promise<ActionResult> {
  const parsed = UuidSchema.safeParse(otherUserId);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');
  const supabase = await createClient();
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('liker_id', userId)
    .eq('likee_id', parsed.data);
  return error ? fail(fromDbError(error)) : ok(undefined);
}
