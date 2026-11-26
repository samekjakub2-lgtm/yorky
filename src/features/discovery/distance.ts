import type { useTranslations } from 'next-intl';

type DiscoveryT = ReturnType<typeof useTranslations<'discovery'>>;

/**
 * Pásmo vzdialenosti zo servera (private.distance_bucket_km):
 * 0 = "< 1 km", 1–9 po 1 km, od 10 po 5 km, null = skrytá.
 * Klient NIKDY nepočíta vzdialenosť sám – iba formátuje pásmo.
 */
export function formatDistanceBucket(t: DiscoveryT, bucketKm: number | null): string {
  if (bucketKm === null) return t('distance.hidden');
  if (bucketKm <= 0) return t('distance.lessThanOne');
  return t('distance.km', { count: bucketKm });
}
