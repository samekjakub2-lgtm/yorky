'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { type ActionResult, fail, ok } from '@/lib/action-result';
import {
  getStripe,
  getStripeConfig,
  PLANS,
  priceIdFor,
  stripeErrorCode,
} from '@/lib/stripe/server';
import { createClient, getUserId } from '@/lib/supabase/server';

const PlanSchema = z.enum(PLANS);

async function myCustomerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_my_stripe_customer_id');
  if (error) throw error;
  return data;
}

async function hasActivePremium(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entitlements')
    .select('is_premium, expires_at')
    .maybeSingle();
  if (error) throw error;
  if (!data?.is_premium) return false;
  return data.expires_at === null || new Date(data.expires_at) > new Date();
}

/**
 * Vytvorí Stripe Checkout pre predplatné a vráti jeho URL. Zákazníkovi v Stripe
 * neposielame meno ani e-mail (minimalizácia) – iba user_id v metadátach, podľa
 * ktorého webhook priradí platbu. Prémium aktivuje až webhook, nie návrat z Checkoutu.
 */
export async function startCheckout(plan: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = PlanSchema.safeParse(plan);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');
  const config = getStripeConfig();
  const stripe = getStripe();
  if (!config || !stripe) return fail('generic');

  try {
    if (await hasActivePremium()) return fail('not_allowed');

    // Idempotency key zabráni duplicitnému zákazníkovi pri opakovanom kliknutí
    // (mapovanie uloží webhook `customer.created`).
    const customer =
      (await myCustomerId()) ??
      (
        await stripe.customers.create(
          { metadata: { user_id: userId } },
          { idempotencyKey: `yorky-customer-${userId}` },
        )
      ).id;

    const locale = await getLocale();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: userId,
      line_items: [{ price: priceIdFor(config, parsed.data), quantity: 1 }],
      subscription_data: { metadata: { user_id: userId } },
      allow_promotion_codes: true,
      locale: locale === 'cs' ? 'cs' : 'sk',
      success_url: `${config.APP_URL}/premium?checkout=success`,
      cancel_url: `${config.APP_URL}/premium?checkout=canceled`,
    });
    return session.url ? ok({ url: session.url }) : fail('generic');
  } catch (error) {
    console.error('premium.start_checkout: failed', { code: stripeErrorCode(error) });
    return fail('generic');
  }
}

/** Stripe Customer Portal – zmena plánu, platobnej karty, zrušenie predplatného. */
export async function openCustomerPortal(): Promise<ActionResult<{ url: string }>> {
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');
  const config = getStripeConfig();
  const stripe = getStripe();
  if (!config || !stripe) return fail('generic');

  try {
    const customer = await myCustomerId();
    if (!customer) return fail('not_allowed');
    const locale = await getLocale();
    const session = await stripe.billingPortal.sessions.create({
      customer,
      locale: locale === 'cs' ? 'cs' : 'sk',
      return_url: `${config.APP_URL}/premium`,
    });
    return ok({ url: session.url });
  } catch (error) {
    console.error('premium.open_portal: failed', { code: stripeErrorCode(error) });
    return fail('generic');
  }
}
