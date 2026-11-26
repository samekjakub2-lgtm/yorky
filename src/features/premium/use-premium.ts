'use client';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';

export const premiumKey = ['premium'] as const;

/** Po návrate z Checkoutu čakáme na webhook najviac ~1 minútu. */
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

/**
 * Stav prémia podľa servera (tabuľka entitlements, plnená Stripe webhookom).
 * UI sa podľa neho riadi; server prémiové funkcie vynucuje sám.
 * `pollUntilPremium` – po platbe opakuje dotaz, kým webhook prémium nezapíše.
 */
export function usePremium({ pollUntilPremium = false }: { pollUntilPremium?: boolean } = {}) {
  return useQuery({
    queryKey: premiumKey,
    queryFn: async () => {
      const { data, error } = await createClient().from('entitlements').select('*').maybeSingle();
      if (error) throw error;
      if (!data?.is_premium) return false;
      return data.expires_at === null || new Date(data.expires_at) > new Date();
    },
    refetchInterval: (query) =>
      pollUntilPremium && query.state.data !== true && query.state.dataUpdateCount < MAX_POLLS
        ? POLL_INTERVAL_MS
        : false,
  });
}
