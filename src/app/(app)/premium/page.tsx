import { PremiumView } from '@/features/premium/premium-view';
import { getPlanOffers } from '@/features/premium/plans';

export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string | string[] }>;
}) {
  const [{ checkout }, offers] = await Promise.all([searchParams, getPlanOffers()]);
  const status = checkout === 'success' || checkout === 'canceled' ? checkout : undefined;
  return <PremiumView offers={offers} checkout={status} />;
}
