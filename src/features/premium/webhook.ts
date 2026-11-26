import 'server-only';

import type Stripe from 'stripe';
import { z } from 'zod';

import {
  removeStripeCustomer,
  SyncError,
  syncStripeCustomer,
} from '@/features/premium/stripe-sync';
import { getStripe, stripeErrorCode } from '@/lib/stripe/server';

const WebhookSecretSchema = z.string().startsWith('whsec_');

const customerIdOf = (customer: string | { id: string } | null): string | null =>
  customer === null ? null : typeof customer === 'string' ? customer : customer.id;

/** Udalosti, po ktorých treba prepočítať prémium zákazníka. */
function customerToSync(event: Stripe.Event): string | null {
  switch (event.type) {
    case 'customer.created':
    case 'customer.updated':
      return event.data.object.id;
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed':
      return customerIdOf(event.data.object.customer);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
      return customerIdOf(event.data.object.customer);
    case 'invoice.paid':
    case 'invoice.payment_failed':
      return customerIdOf(event.data.object.customer);
    default:
      return null;
  }
}

/**
 * Stripe webhook: overí podpis, z udalosti vezme iba customer id a stav načíta zo
 * Stripe API (CLAUDE.md). Loguje iba typ udalosti a kód chyby (pravidlo 7).
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  const stripe = getStripe();
  const secret = WebhookSecretSchema.safeParse(process.env.STRIPE_WEBHOOK_SECRET);
  if (!stripe || !secret.success) {
    console.error('stripe_webhook: not_configured');
    return new Response(null, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response(null, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret.data);
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    if (event.type === 'customer.deleted') {
      await removeStripeCustomer(event.data.object.id);
    } else {
      const customerId = customerToSync(event);
      if (customerId) await syncStripeCustomer(stripe, customerId);
    }
  } catch (error) {
    const code = error instanceof SyncError ? error.message : stripeErrorCode(error);
    console.error('stripe_webhook: failed', { type: event.type, code });
    // 500 → Stripe udalosť zopakuje; synchronizácia je idempotentná.
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}
