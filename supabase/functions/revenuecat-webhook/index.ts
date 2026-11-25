// Webhook RevenueCat → tabuľka public.entitlements.
// Stav prémia neberieme z tela webhooku, ale overíme ho cez RevenueCat REST API
// (webhook môže prísť mimo poradia alebo byť podvrhnutý).
//
// Secrets: REVENUECAT_WEBHOOK_AUTH, REVENUECAT_SECRET_API_KEY
// App User ID v RevenueCat = Supabase user id (nastavuje src/lib/revenuecat.ts).
import { z } from 'npm:zod@4';

import { createAdminClient, json } from '../_shared/supabase-admin.ts';

const ENTITLEMENT_ID = 'premium';

const WebhookBody = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
  }),
});

const Subscriber = z.object({
  subscriber: z.object({
    entitlements: z.record(
      z.string(),
      z.object({ expires_date: z.string().nullable() }),
    ),
  }),
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  const auth = req.headers.get('Authorization') ?? '';
  if (!expected || !timingSafeEqual(auth, `Bearer ${expected}`)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const parsed = WebhookBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'bad_request' }, 400);

  const userId = parsed.data.event.app_user_id;
  if (!z.uuid().safeParse(userId).success) {
    // Anonymné RevenueCat ID ($RCAnonymousID:...) ignorujeme.
    return json({ ok: true, skipped: true });
  }

  const rcResponse = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${Deno.env.get('REVENUECAT_SECRET_API_KEY')}` } },
  );
  if (!rcResponse.ok) return json({ error: 'revenuecat_unavailable' }, 502);

  const subscriber = Subscriber.safeParse(await rcResponse.json());
  if (!subscriber.success) return json({ error: 'unexpected_revenuecat_response' }, 502);

  const entitlement = subscriber.data.subscriber.entitlements[ENTITLEMENT_ID];
  const expiresAt = entitlement?.expires_date ?? null;
  const isPremium = !!entitlement && (expiresAt === null || new Date(expiresAt) > new Date());

  const admin = createAdminClient();
  const { error } = await admin
    .from('entitlements')
    .upsert({ user_id: userId, is_premium: isPremium, expires_at: expiresAt });
  if (error) return json({ error: 'db_error' }, 500);

  // Po strate prémia vypni prémiové funkcie.
  if (!isPremium) {
    await admin.from('profiles').update({ is_incognito: false }).eq('id', userId);
  }

  return json({ ok: true });
});
