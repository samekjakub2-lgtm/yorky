'use client';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';

/**
 * Stav prémia podľa servera (tabuľka entitlements, plnená Stripe webhookom).
 * UI sa podľa neho riadi; server prémiové funkcie vynucuje sám.
 */
export function usePremium() {
  return useQuery({
    queryKey: ['premium'],
    queryFn: async () => {
      const { data, error } = await createClient().from('entitlements').select('*').maybeSingle();
      if (error) throw error;
      if (!data?.is_premium) return false;
      return data.expires_at === null || new Date(data.expires_at) > new Date();
    },
  });
}
