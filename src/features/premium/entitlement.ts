import type Stripe from 'stripe';

import type { Database } from '@/types/database';

type EntitlementRow = Pick<
  Database['public']['Tables']['entitlements']['Insert'],
  'is_premium' | 'expires_at'
>;
type SubscriptionRow = Omit<Database['public']['Tables']['subscriptions']['Insert'], 'user_id'>;

/**
 * Stavy, v ktorých má používateľ prémium. `past_due` = Stripe ešte skúša strhnúť platbu
 * (grace period); po neúspechu prejde do `unpaid`/`canceled` a prémium zanikne.
 */
const PREMIUM_STATUSES = new Set<string>(['active', 'trialing', 'past_due']);

const toIso = (unixSeconds: number | null) =>
  unixSeconds === null ? null : new Date(unixSeconds * 1000).toISOString();

/** Koniec aktuálneho obdobia (od API 2025-03 je na položkách predplatného). */
export function periodEnd(subscription: Stripe.Subscription): number | null {
  const ends = subscription.items.data.map((item) => item.current_period_end);
  return ends.length > 0 ? Math.max(...ends) : null;
}

function productId(subscription: Stripe.Subscription): string | null {
  const product = subscription.items.data[0]?.price.product;
  if (!product) return null;
  return typeof product === 'string' ? product : product.id;
}

/** Zdroj pravdy o prémiu (tabuľka entitlements) zo stavu predplatných v Stripe API. */
export function computeEntitlement(subscriptions: Stripe.Subscription[]): EntitlementRow {
  const ends = subscriptions.filter((s) => PREMIUM_STATUSES.has(s.status)).map((s) => periodEnd(s));
  if (ends.length === 0) return { is_premium: false, expires_at: null };
  const known = ends.filter((end): end is number => end !== null);
  return { is_premium: true, expires_at: known.length > 0 ? toIso(Math.max(...known)) : null };
}

function isBetter(a: Stripe.Subscription, b: Stripe.Subscription): boolean {
  const aPremium = PREMIUM_STATUSES.has(a.status);
  const bPremium = PREMIUM_STATUSES.has(b.status);
  return aPremium !== bPremium ? aPremium : a.created > b.created;
}

/**
 * Riadky prehľadu predplatných (jeden na produkt). Pri viacerých predplatných toho istého
 * produktu vyhráva aktívne, potom najnovšie.
 */
export function toSubscriptionRows(subscriptions: Stripe.Subscription[]): SubscriptionRow[] {
  const byProduct = new Map<string, Stripe.Subscription>();
  for (const sub of subscriptions) {
    const product = productId(sub);
    if (!product) continue;
    const current = byProduct.get(product);
    if (!current || isBetter(sub, current)) byProduct.set(product, sub);
  }

  return [...byProduct.entries()].map(([product, sub]) => ({
    product_id: product,
    store: 'stripe',
    period_type: sub.status === 'trialing' ? 'trial' : 'normal',
    purchased_at: toIso(sub.start_date),
    expires_at: toIso(periodEnd(sub)),
    will_renew:
      PREMIUM_STATUSES.has(sub.status) && !sub.cancel_at_period_end && sub.cancel_at === null,
    has_billing_issue: sub.status === 'past_due' || sub.status === 'unpaid',
    is_sandbox: !sub.livemode,
  }));
}
