'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { openCustomerPortal, startCheckout } from '@/features/premium/actions';
import type { PlanOffer } from '@/features/premium/plans';
import { usePremium } from '@/features/premium/use-premium';
import type { Plan } from '@/lib/stripe/server';

/** Po tomto čase bez aktivácie ukážeme upokojujúcu správu (webhook môže meškať). */
const SLOW_ACTIVATION_MS = 60_000;

const BENEFITS = ['incomingLikes', 'incognito', 'support'] as const;

/** Percento úspory ročného plánu oproti 12 × mesačný (iba pri rovnakej mene). */
function yearlySavings(offers: PlanOffer[]): number | null {
  const monthly = offers.find((o) => o.plan === 'monthly');
  const yearly = offers.find((o) => o.plan === 'yearly');
  if (!monthly || !yearly || monthly.currency !== yearly.currency) return null;
  const percent = Math.round((1 - yearly.unitAmount / (monthly.unitAmount * 12)) * 100);
  return percent > 0 ? percent : null;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="text-accent size-5 shrink-0">
      <path
        fill="currentColor"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
      />
    </svg>
  );
}

export function PremiumView({
  offers,
  checkout,
}: {
  offers: PlanOffer[] | null;
  checkout?: 'success' | 'canceled';
}) {
  const t = useTranslations('premium');
  const format = useFormatter();
  const premium = usePremium({ pollUntilPremium: checkout === 'success' });
  const [selected, setSelected] = useState<Plan>('yearly');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [slowActivation, setSlowActivation] = useState(false);

  useEffect(() => {
    if (checkout !== 'success') return;
    const timer = setTimeout(() => setSlowActivation(true), SLOW_ACTIVATION_MS);
    return () => clearTimeout(timer);
  }, [checkout]);

  const price = (offer: PlanOffer, amount = offer.unitAmount) =>
    format.number(amount / 100, { style: 'currency', currency: offer.currency });

  const go = (action: () => ReturnType<typeof openCustomerPortal>, errorMessage: string) =>
    startTransition(async () => {
      setError(undefined);
      const result = await action();
      if (result.ok) window.location.assign(result.data.url);
      else setError(errorMessage);
    });

  const isPremium = premium.data === true;
  const savings = offers ? yearlySavings(offers) : null;
  const waitingForWebhook = checkout === 'success' && !isPremium && !premium.isPending;

  return (
    <>
      <PageHeader title={t('title')} />

      {waitingForWebhook ? (
        <p role="status" className="bg-surface mb-4 rounded-2xl p-3 text-sm">
          {slowActivation ? t('checkout.pending') : t('checkout.success')}
        </p>
      ) : null}
      {checkout === 'canceled' && !isPremium ? (
        <p role="status" className="bg-surface mb-4 rounded-2xl p-3 text-sm">
          {t('checkout.canceled')}
        </p>
      ) : null}

      {premium.isPending ? null : isPremium ? (
        <section className="bg-surface flex flex-col gap-3 rounded-2xl p-4">
          <h2 className="text-lg font-semibold">{t('active.title')}</h2>
          <p className="text-muted text-sm">{t('active.body')}</p>
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => go(openCustomerPortal, t('errors.portalFailed'))}>
            {t('active.manage')}
          </Button>
        </section>
      ) : (
        <>
          <section className="mb-6">
            <h2 className="text-xl font-bold">{t('headline')}</h2>
            <p className="text-muted mt-1 text-sm">{t('subtitle')}</p>
            <ul aria-label={t('benefits.label')} className="mt-4 flex flex-col gap-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>{t(`benefits.${benefit}`)}</span>
                </li>
              ))}
            </ul>
          </section>

          {offers ? (
            <>
              <fieldset className="mb-4 flex flex-col gap-2">
                <legend className="mb-2 font-semibold">{t('plans.label')}</legend>
                {offers.map((offer) => (
                  <label
                    key={offer.plan}
                    className="bg-surface has-checked:border-accent flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 border-transparent p-4">
                    <input
                      type="radio"
                      name="plan"
                      value={offer.plan}
                      checked={selected === offer.plan}
                      onChange={() => setSelected(offer.plan)}
                      className="accent-accent size-5"
                    />
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold">{t(`plans.${offer.plan}`)}</span>
                      <span className="text-muted text-sm">
                        {t(offer.interval === 'year' ? 'plans.priceYear' : 'plans.priceMonth', {
                          price: price(offer),
                        })}
                      </span>
                      {offer.interval === 'year' ? (
                        <span className="text-muted text-xs">
                          {t('plans.perMonth', {
                            price: price(offer, Math.round(offer.unitAmount / 12)),
                          })}
                        </span>
                      ) : null}
                    </span>
                    {offer.plan === 'yearly' && savings ? (
                      <span className="bg-accent rounded-full px-2 py-1 text-xs font-semibold text-white">
                        {t('plans.save', { percent: savings })}
                      </span>
                    ) : null}
                  </label>
                ))}
              </fieldset>

              <Button
                loading={pending}
                onClick={() => go(() => startCheckout(selected), t('errors.checkoutFailed'))}>
                {t('cta')}
              </Button>
              <p className="text-muted mt-3 text-xs">{t('finePrint')}</p>
            </>
          ) : (
            <p className="text-muted text-sm">{t('unavailable')}</p>
          )}
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </>
  );
}
