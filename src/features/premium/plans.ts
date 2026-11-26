import 'server-only';

import { cache } from 'react';

import {
  getStripe,
  getStripeConfig,
  type Plan,
  PLANS,
  priceIdFor,
  stripeErrorCode,
} from '@/lib/stripe/server';

const INTERVALS = ['month', 'year'] as const;
type Interval = (typeof INTERVALS)[number];
const isInterval = (value: string): value is Interval => INTERVALS.some((i) => i === value);

export type PlanOffer = {
  plan: Plan;
  /** Cena v najmenších jednotkách meny (centy). */
  unitAmount: number;
  currency: string;
  interval: Interval;
};

/** Ceny plánov priamo zo Stripe (jediný zdroj pravdy o cene). null = prémium nedostupné. */
export const getPlanOffers = cache(async (): Promise<PlanOffer[] | null> => {
  const config = getStripeConfig();
  const stripe = getStripe();
  if (!config || !stripe) return null;
  try {
    const offers = await Promise.all(
      PLANS.map(async (plan): Promise<PlanOffer | null> => {
        const price = await stripe.prices.retrieve(priceIdFor(config, plan));
        if (!price.active || !price.recurring || price.unit_amount === null) return null;
        const { interval } = price.recurring;
        if (!isInterval(interval) || price.recurring.interval_count !== 1) return null;
        return {
          plan,
          unitAmount: price.unit_amount,
          currency: price.currency.toUpperCase(),
          interval,
        };
      }),
    );
    const valid = offers.filter((offer): offer is PlanOffer => offer !== null);
    return valid.length > 0 ? valid : null;
  } catch (error) {
    console.error('premium.load_plans: failed', { code: stripeErrorCode(error) });
    return null;
  }
});
