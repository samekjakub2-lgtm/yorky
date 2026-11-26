// Webhook RevenueCat → tabuľky public.entitlements (zdroj pravdy o prémiu)
// a public.subscriptions (prehľad predplatných na zobrazenie).
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

const STORES = ['app_store', 'play_store', 'stripe', 'promotional'] as const;
const PERIOD_TYPES = ['normal', 'trial', 'intro', 'prepaid'] as const;

const Subscriber = z.object({
  subscriber: z.object({
    entitlements: z.record(
      z.string(),
      z.object({ expires_date: z.string().nullable() }),
    ),
    subscriptions: z
      .record(
        z.string(),
        z.object({
          store: z.string(),
          period_type: z.string().nullish(),
          purchase_date: z.string().nullish(),
          expires_date: z.string().nullish(),
          unsubscribe_detected_at: z.string().nullish(),
          billing_issues_detected_at: z.string().nullish(),
          is_sandbox: z.boolean().optional(),
        }),
      )
      .default({}),
  }),
});

function oneOf<T extends string>(allowed: readonly T[], value: string | null | undefined) {
  return allowed.find((v) => v === value) ?? null;
}

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

  // Prehľad predplatných (iba na zobrazenie – prémium sa riadi entitlements vyššie).
  const subscriptionRows = Object.entries(subscriber.data.subscriber.subscriptions).map(
    ([productId, s]) => ({
      user_id: userId,
      product_id: productId,
      store: oneOf(STORES, s.store) ?? 'other',
      period_type: oneOf(PERIOD_TYPES, s.period_type),
      purchased_at: s.purchase_date ?? null,
      expires_at: s.expires_date ?? null,
      will_renew: !s.unsubscribe_detected_at,
      has_billing_issue: !!s.billing_issues_detected_at,
      is_sandbox: s.is_sandbox ?? false,
    }),
  );
  if (subscriptionRows.length > 0) {
    const { error: subError } = await admin
      .from('subscriptions')
      .upsert(subscriptionRows, { onConflict: 'user_id,product_id' });
    if (subError) return json({ error: 'db_error' }, 500);
  }

  // Po strate prémia vypni prémiové funkcie.
  if (!isPremium) {
    await admin.from('profiles').update({ is_incognito: false }).eq('id', userId);
  }

  return json({ ok: true });
});
