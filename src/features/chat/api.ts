'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { markConversationRead, sendMessage, startConversation } from '@/features/chat/actions';
import { createClient } from '@/lib/supabase/client';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: ['chat', 'conversations'] as const,
  conversation: (conversationId: string) => ['chat', 'conversation', conversationId] as const,
  messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
};

/** Moje konverzácie (meno druhej strany, náhľad, neprečítané) – cez RPC, nie priamy SELECT profilov. */
export function useConversations() {
  const queryClient = useQueryClient();

  // Realtime – RLS na messages zaručí, že prídu iba správy z mojich konverzácií.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('conversations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () =>
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: async () => {
      const { data, error } = await createClient().rpc('list_conversations');
      if (error) throw error;
      return data;
    },
  });
}

/** Hlavička jednej konverzácie; null, ak neexistuje, nie som účastník alebo je blokovaná. */
export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: async () => {
      const { data, error } = await createClient().rpc('list_conversations', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();

  // Realtime – RLS na messages zaručí, že prídu iba správy z mojich konverzácií.
  // INSERT = nová správa, UPDATE = druhá strana si správy prečítala (read_at).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('messages')
        .select('id, sender_id, body, created_at, read_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      // Server vracia najnovšie; v UI ich zobrazujeme chronologicky.
      return data.reverse();
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const result = await sendMessage({ conversationId, body });
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.all }),
  });
}

export function useMarkConversationRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await markConversationRead(conversationId);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversations }),
  });
}

/** Otvorí (alebo vytvorí) konverzáciu s používateľom a vráti jej id. */
export function useStartConversation() {
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const result = await startConversation(otherUserId);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
  });
}
