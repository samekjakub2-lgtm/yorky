import { useEffect } from 'react';

import { useSessionStore } from '@/features/auth/session-store';
import { queryClient } from '@/lib/query-client';
import { configureRevenueCat, resetRevenueCat } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';

/** Synchronizuje Supabase session do store a prepojí RevenueCat s user id. */
export function useAuthListener(): void {
  const setSession = useSessionStore((s) => s.setSession);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) configureRevenueCat(session.user.id);
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        void resetRevenueCat();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [setSession]);
}
