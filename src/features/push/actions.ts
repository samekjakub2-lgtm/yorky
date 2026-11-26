'use server';

import { z } from 'zod';

import { type ActionResult, fail, fromDbError, ok } from '@/lib/action-result';
import { createClient, getUserId } from '@/lib/supabase/server';

const PushSubscriptionSchema = z.object({
  endpoint: z.url().startsWith('https://').max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

/** Uloží Web Push odber prihláseného používateľa (iba technické údaje odberu). */
export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const parsed = PushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');

  const supabase = await createClient();
  // Rovnaký endpoint (napr. po odhlásení iného účtu na tom istom zariadení) sa nahradí.
  await supabase.from('push_subscriptions').delete().eq('endpoint', parsed.data.endpoint);
  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  return error ? fail(fromDbError(error)) : ok(undefined);
}
