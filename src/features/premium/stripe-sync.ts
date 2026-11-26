import 'server-only';

import type Stripe from 'stripe';
import { z } from 'zod';

import { computeEntitlement, toSubscriptionRows } from '@/features/premium/entitlement';
import { createAdminClient } from '@/lib/supabase/admin';

/** Chyba synchronizácie; správa je iba technický kód (bezpečná na logovanie). */
export class SyncError extends Error {}

/**
 * Synchronizuje prémium zákazníka zo Stripe API do entitlements / subscriptions.
 * Volá ju iba Stripe webhook (service_role). Z udalosti sa berie len customer id,
 * stav predplatných sa vždy načíta zo Stripe API – spracovanie je idempotentné
 * a nezáleží na poradí udalostí.
 */
export async function syncStripeCustomer(stripe: Stripe, customerId: string): Promise<void> {
  const admin = createAdminClient();

  const userId = await resolveUserId(stripe, admin, customerId);
  if (!userId) return; // zákazník nepatrí Yorky používateľovi (alebo už bol zmazaný)

  const subscriptions = await stripe.subscriptions
    .list({ customer: customerId, status: 'all', limit: 100 })
    .autoPagingToArray({ limit: 1000 });

  const entitlement = computeEntitlement(subscriptions);
  const { error: entitlementError } = await admin
    .from('entitlements')
    .upsert({ user_id: userId, ...entitlement }, { onConflict: 'user_id' });
  if (entitlementError) throw new SyncError(`entitlements_upsert_${entitlementError.code}`);

  const rows = toSubscriptionRows(subscriptions).map((row) => ({ ...row, user_id: userId }));
  if (rows.length > 0) {
    const { error } = await admin
      .from('subscriptions')
      .upsert(rows, { onConflict: 'user_id,product_id' });
    if (error) throw new SyncError(`subscriptions_upsert_${error.code}`);
  }
}

/** Zákazník bol zmazaný v Stripe: zruš mapovanie a prémium. */
export async function removeStripeCustomer(customerId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stripe_customers')
    .delete()
    .eq('customer_id', customerId)
    .select('user_id')
    .maybeSingle();
  if (error) throw new SyncError(`stripe_customers_delete_${error.code}`);
  if (!data) return;
  const { error: entitlementError } = await admin
    .from('entitlements')
    .upsert(
      { user_id: data.user_id, is_premium: false, expires_at: null },
      { onConflict: 'user_id' },
    );
  if (entitlementError) throw new SyncError(`entitlements_upsert_${entitlementError.code}`);
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * user_id zákazníka: z tabuľky stripe_customers, inak z metadát zákazníka v Stripe API
 * (nastavuje ich iba náš server pri vytvorení zákazníka) – vtedy mapovanie uloží.
 */
async function resolveUserId(
  stripe: Stripe,
  admin: AdminClient,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw new SyncError(`stripe_customers_select_${error.code}`);
  if (data) return data.user_id;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const parsed = z.uuid().safeParse(customer.metadata.user_id);
  if (!parsed.success) return null;

  // Účet mohol byť medzitým zmazaný – potom ho neobnovujeme.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', parsed.data)
    .maybeSingle();
  if (profileError) throw new SyncError(`profiles_select_${profileError.code}`);
  if (!profile) return null;

  const { error: insertError } = await admin
    .from('stripe_customers')
    .upsert(
      { user_id: parsed.data, customer_id: customerId },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
  if (insertError) throw new SyncError(`stripe_customers_upsert_${insertError.code}`);
  return parsed.data;
}
