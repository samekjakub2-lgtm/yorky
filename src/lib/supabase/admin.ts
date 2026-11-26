import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * ⚠️ service_role obchádza RLS. Iba pre webhooky a admin úlohy (Stripe webhook),
 * NIKDY na čítanie dát pre bežnú požiadavku používateľa.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY');
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
