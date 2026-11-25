// Úplné zmazanie účtu: fotky v Storage + auth.users (zvyšok zmaže ON DELETE CASCADE).
import { createClient } from 'npm:@supabase/supabase-js@2';

import { createAdminClient, json } from '../_shared/supabase-admin.ts';

const BUCKET = 'profile-photos';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Overenie volajúceho cez jeho JWT.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);
  const userId = userData.user.id;

  const admin = createAdminClient();

  // 1) Fotky v Storage (po dávkach).
  for (;;) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(userId, { limit: 100 });
    if (error) return json({ error: 'storage_list_failed' }, 500);
    if (!files || files.length === 0) break;
    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) return json({ error: 'storage_remove_failed' }, 500);
  }

  // 2) Používateľ – kaskádovo zmaže profil, polohu, správy, blokácie, nároky.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'delete_failed' }, 500);

  return json({ ok: true });
});
