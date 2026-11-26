import 'server-only';

import Stripe from 'stripe';
import { z } from 'zod';

/**
 * Stripe na serveri. Tajomstvá iba z prostredia (Vercel / .env.local), nikdy v repe.
 * Ak Stripe nie je nakonfigurovaný, funkcie vrátia null a paywall ukáže „nedostupné“.
 */
const StripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_/),
  STRIPE_PRICE_MONTHLY: z.string().startsWith('price_'),
  STRIPE_PRICE_YEARLY: z.string().startsWith('price_'),
  APP_URL: z.url(),
});

export type StripeConfig = z.infer<typeof StripeEnvSchema>;

export const PLANS = ['monthly', 'yearly'] as const;
export type Plan = (typeof PLANS)[number];

let client: Stripe | undefined;

export function getStripeConfig(): StripeConfig | null {
  const parsed = StripeEnvSchema.safeParse({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_MONTHLY: process.env.STRIPE_PRICE_MONTHLY,
    STRIPE_PRICE_YEARLY: process.env.STRIPE_PRICE_YEARLY,
    APP_URL: process.env.APP_URL,
  });
  return parsed.success ? parsed.data : null;
}

export function getStripe(): Stripe | null {
  const config = getStripeConfig();
  if (!config) return null;
  client ??= new Stripe(config.STRIPE_SECRET_KEY, { appInfo: { name: 'yorky' } });
  return client;
}

export function priceIdFor(config: StripeConfig, plan: Plan): string {
  return plan === 'monthly' ? config.STRIPE_PRICE_MONTHLY : config.STRIPE_PRICE_YEARLY;
}

/** Technický kód chyby na logovanie – nikdy správa ani dáta požiadavky (pravidlo 7). */
export function stripeErrorCode(error: unknown): string {
  if (error instanceof Stripe.errors.StripeError) return error.code ?? error.type;
  return 'unknown';
}
