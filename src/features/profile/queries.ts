import 'server-only';

import { createClient } from '@/lib/supabase/server';

/** Má prihlásený používateľ vytvorený profil? (RLS: vidí iba vlastný riadok.) */
export async function hasMyProfile(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('id').maybeSingle();
  if (error) throw new Error('profile_lookup_failed');
  return data !== null;
}
