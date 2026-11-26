'use server';

import { z } from 'zod';

import { type ActionResult, fail, fromDbError, ok, UuidSchema } from '@/lib/action-result';
import { createClient, getUserId } from '@/lib/supabase/server';

export async function blockUser(blockedId: unknown): Promise<ActionResult> {
  const parsed = UuidSchema.safeParse(blockedId);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');

  const supabase = await createClient();
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: userId, blocked_id: parsed.data });
  return error ? fail(fromDbError(error)) : ok(undefined);
}

const ReportSchema = z.object({
  reportedId: z.uuid(),
  reason: z.enum([
    'fake_profile',
    'harassment',
    'spam',
    'underage',
    'inappropriate_content',
    'other',
  ]),
  details: z.string().trim().max(1000).optional(),
});

export async function reportUser(input: unknown): Promise<ActionResult> {
  const parsed = ReportSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');

  const supabase = await createClient();
  const { error } = await supabase.from('reports').insert({
    reporter_id: userId,
    reported_id: parsed.data.reportedId,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });
  return error ? fail(fromDbError(error)) : ok(undefined);
}
