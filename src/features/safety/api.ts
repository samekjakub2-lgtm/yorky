import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/session-store';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export function useBlockUser() {
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: userId, blocked_id: blockedId });
      if (error) throw error;
    },
    // Blokovaný zmizne z discovery aj chatu (vynucuje RLS) – zahoď cache.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useReportUser() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (input: {
      reportedId: string;
      reason: Enums<'report_reason'>;
      details?: string;
    }) => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase.from('reports').insert({
        reporter_id: userId,
        reported_id: input.reportedId,
        reason: input.reason,
        details: input.details ?? null,
      });
      if (error) throw error;
    },
  });
}
