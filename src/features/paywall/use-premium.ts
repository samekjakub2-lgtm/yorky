import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/session-store';
import { supabase } from '@/lib/supabase';

/**
 * Stav prémia podľa servera (tabuľka entitlements, plnená webhookom RevenueCat).
 * UI sa podľa neho riadi; server prémiové funkcie vynucuje sám.
 */
export function usePremium() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['premium', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('entitlements').select('*').maybeSingle();
      if (error) throw error;
      if (!data?.is_premium) return false;
      return data.expires_at === null || new Date(data.expires_at) > new Date();
    },
  });
}
