import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { computeEntitlement, toSubscriptionRows } from '@/features/premium/entitlement';

const JAN = 1767225600; // 2026-01-01T00:00:00Z
const FEB = 1769904000; // 2026-02-01T00:00:00Z

function sub(overrides: {
  status: Stripe.Subscription.Status;
  end?: number;
  product?: string;
  created?: number;
  cancelAtPeriodEnd?: boolean;
  livemode?: boolean;
}): Stripe.Subscription {
  return {
    status: overrides.status,
    created: overrides.created ?? JAN,
    start_date: overrides.created ?? JAN,
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    cancel_at: null,
    livemode: overrides.livemode ?? true,
    items: {
      data: [
        {
          current_period_end: overrides.end ?? FEB,
          price: { product: overrides.product ?? 'prod_premium' },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

describe('computeEntitlement', () => {
  it('bez predplatného nie je prémium', () => {
    expect(computeEntitlement([])).toEqual({ is_premium: false, expires_at: null });
  });

  it.each(['active', 'trialing', 'past_due'] as const)('stav %s dáva prémium', (status) => {
    expect(computeEntitlement([sub({ status })])).toEqual({
      is_premium: true,
      expires_at: '2026-02-01T00:00:00.000Z',
    });
  });

  it.each(['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'] as const)(
    'stav %s prémium nedáva',
    (status) => {
      expect(computeEntitlement([sub({ status })]).is_premium).toBe(false);
    },
  );

  it('expirácia je najneskorší koniec obdobia aktívnych predplatných', () => {
    const result = computeEntitlement([
      sub({ status: 'active', end: JAN }),
      sub({ status: 'canceled', end: FEB + 1000 }),
      sub({ status: 'active', end: FEB }),
    ]);
    expect(result.expires_at).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('toSubscriptionRows', () => {
  it('jeden riadok na produkt, aktívne predplatné má prednosť pred novším zrušeným', () => {
    const rows = toSubscriptionRows([
      sub({ status: 'active', created: JAN }),
      sub({ status: 'canceled', created: FEB }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      product_id: 'prod_premium',
      will_renew: true,
      store: 'stripe',
    });
  });

  it('zrušené ku koncu obdobia sa neobnoví, past_due má problém s platbou', () => {
    const [row] = toSubscriptionRows([
      sub({ status: 'past_due', cancelAtPeriodEnd: true, livemode: false }),
    ]);
    expect(row).toMatchObject({ will_renew: false, has_billing_issue: true, is_sandbox: true });
  });

  it('trial sa označí ako trial', () => {
    expect(toSubscriptionRows([sub({ status: 'trialing' })])[0]?.period_type).toBe('trial');
  });
});
