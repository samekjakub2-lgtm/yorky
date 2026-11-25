import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSessionStore } from '@/features/auth/session-store';
import { supabase } from '@/lib/supabase';

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();

  // Realtime – RLS na messages zaručí, že prídu iba správy z mojich konverzácií.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (body: string) => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: userId, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) }),
  });
}

export function useStartConversation() {
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc('start_conversation', { p_other: otherUserId });
      if (error) throw error;
      return data;
    },
  });
}
