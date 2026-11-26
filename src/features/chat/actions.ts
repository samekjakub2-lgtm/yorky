'use server';

import { z } from 'zod';

import { type ActionResult, fail, fromDbError, ok, UuidSchema } from '@/lib/action-result';
import { createClient, getUserId } from '@/lib/supabase/server';

const MessageSchema = z.object({
  conversationId: z.uuid(),
  body: z.string().trim().min(1).max(2000),
});

export async function sendMessage(input: unknown): Promise<ActionResult> {
  const parsed = MessageSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');

  const supabase = await createClient();
  const { error } = await supabase.from('messages').insert({
    conversation_id: parsed.data.conversationId,
    sender_id: userId,
    body: parsed.data.body,
  });
  return error ? fail(fromDbError(error)) : ok(undefined);
}

/** Začne (alebo vráti existujúcu) konverzáciu. */
export async function startConversation(otherUserId: unknown): Promise<ActionResult<string>> {
  const parsed = UuidSchema.safeParse(otherUserId);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('start_conversation', { p_other: parsed.data });
  return error || !data ? fail(fromDbError(error)) : ok(data);
}

/** Označí prijaté správy v konverzácii ako prečítané (RLS: iba príjemca, iba stĺpec read_at). */
export async function markConversationRead(conversationId: unknown): Promise<ActionResult> {
  const parsed = UuidSchema.safeParse(conversationId);
  if (!parsed.success) return fail('invalid_input');
  const userId = await getUserId();
  if (!userId) return fail('not_authenticated');

  const supabase = await createClient();
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', parsed.data)
    .neq('sender_id', userId)
    .is('read_at', null);
  return error ? fail(fromDbError(error)) : ok(undefined);
}
