import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/session-store';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ProfileUpdate = Pick<
  Database['public']['Tables']['profiles']['Update'],
  'display_name' | 'bio' | 'height_cm' | 'hide_distance' | 'is_incognito' | 'locale'
>;

export const profileKeys = {
  mine: ['profile', 'mine'] as const,
  detail: (id: string) => ['profile', id] as const,
};

export function useMyProfile() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: profileKeys.mine,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.mine }),
  });
}

/** Cudzí profil – iba cez RPC (vracia pásmo vzdialenosti, nikdy polohu). */
export function useProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_profile', { p_user_id: userId });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

/** Úplné zmazanie účtu cez Edge Function (fotky + všetky dáta). */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) throw error;
      await supabase.auth.signOut();
    },
  });
}
