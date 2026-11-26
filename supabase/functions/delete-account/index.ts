// Úplné zmazanie účtu: Stripe zákazník (zruší predplatné), fotky v Storage
// a auth.users (zvyšok – profil, poloha, správy, push odbery… – zmaže ON DELETE CASCADE).
//
// Secrets: STRIPE_SECRET_KEY (voliteľné – bez neho sa krok Stripe preskočí).
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

  // 1) Stripe – zmazanie zákazníka okamžite zruší jeho predplatné.
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const { data: customer, error: customerError } = await admin
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (customerError) return json({ error: 'stripe_lookup_failed' }, 500);
  if (customer) {
    if (!stripeKey) return json({ error: 'stripe_not_configured' }, 500);
    const response = await fetch(
      `https://api.stripe.com/v1/customers/${encodeURIComponent(customer.customer_id)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    // 404 = zákazník už neexistuje, môžeme pokračovať.
    if (!response.ok && response.status !== 404) return json({ error: 'stripe_delete_failed' }, 502);
  }

  // 2) Fotky v Storage (po dávkach).
  for (;;) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(userId, { limit: 100 });
    if (error) return json({ error: 'storage_list_failed' }, 500);
    if (!files || files.length === 0) break;
    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) return json({ error: 'storage_remove_failed' }, 500);
  }

  // 3) Používateľ – kaskádovo zmaže profil, polohu, správy, blokácie, nároky, push odbery.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'delete_failed' }, 500);

  return json({ ok: true });
});
