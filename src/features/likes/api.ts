import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSessionStore } from '@/features/auth/session-store';
import { supabase } from '@/lib/supabase';

export const likesKeys = {
  all: ['likes'] as const,
  myLikes: ['likes', 'mine'] as const,
  incoming: ['likes', 'incoming'] as const,
  matches: ['likes', 'matches'] as const,
};

/** ID profilov, ktoré som lajkol (iba moje odoslané like-y). */
export function useMyLikedIds() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: likesKeys.myLikes,
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return new Set<string>();
      const { data, error } = await supabase
        .from('likes')
        .select('likee_id')
        .eq('liker_id', userId);
      if (error) throw error;
      return new Set(data.map((row) => row.likee_id));
    },
  });
}

/** Moje matche (meno, vek, fotka druhej strany) – cez RPC, nikdy priamy SELECT profilov. */
export function useMatches() {
  const queryClient = useQueryClient();

  // Realtime – RLS na matches zaručí, že prídu iba moje matche.
  useEffect(() => {
    const channel = supabase
      .channel('matches')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () =>
        queryClient.invalidateQueries({ queryKey: likesKeys.matches }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: likesKeys.matches,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_matches');
      if (error) throw error;
      return data;
    },
  });
}

/** Kto ma lajkol – prémiová funkcia; server bez prémia vráti 42501. */
export function useIncomingLikes(isPremium: boolean) {
  return useQuery({
    queryKey: likesKeys.incoming,
    enabled: isPremium,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_incoming_likes');
      if (error) throw error;
      return data;
    },
  });
}

/** Lajkne profil. Vráti id matchu, ak bol like vzájomný, inak null. */
export function useLikeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc('like_profile', { p_user_id: otherUserId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: likesKeys.all }),
  });
}

/** Vezme like späť – server zruší aj prípadný match. */
export function useUnlikeProfile() {
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('liker_id', userId)
        .eq('likee_id', otherUserId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: likesKeys.all }),
  });
}
