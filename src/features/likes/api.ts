'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useUserId } from '@/features/auth/user-context';
import { likeProfile, unlikeProfile } from '@/features/likes/actions';
import { createClient } from '@/lib/supabase/client';

export const likesKeys = {
  all: ['likes'] as const,
  myLikes: ['likes', 'mine'] as const,
  incoming: ['likes', 'incoming'] as const,
  matches: ['likes', 'matches'] as const,
};

/** ID profilov, ktoré som lajkol (iba moje odoslané like-y). */
export function useMyLikedIds() {
  const userId = useUserId();
  return useQuery({
    queryKey: likesKeys.myLikes,
    queryFn: async () => {
      const { data, error } = await createClient()
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
    const supabase = createClient();
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
      const { data, error } = await createClient().rpc('list_matches');
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
      const { data, error } = await createClient().rpc('list_incoming_likes');
      if (error) throw error;
      return data;
    },
  });
}

/** Lajkne alebo odlajkne profil; vráti id matchu pri vzájomnom like-u. */
export function useToggleLike() {
  const queryClient = useQueryClient();
  const liked = useMyLikedIds();

  const mutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = liked.data?.has(userId)
        ? await unlikeProfile(userId)
        : await likeProfile(userId);
      if (!result.ok) throw new Error(result.error);
      return result.data ?? null;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: likesKeys.all }),
  });

  return {
    isLiked: (userId: string) => liked.data?.has(userId) ?? false,
    isPending: (userId: string) => mutation.isPending && mutation.variables === userId,
    toggle: mutation.mutateAsync,
  };
}
