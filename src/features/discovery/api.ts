'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { updateMyLocation } from '@/features/discovery/actions';
import { getCoarsePosition } from '@/lib/platform/geolocation';
import { createClient } from '@/lib/supabase/client';

export const discoveryKeys = {
  nearby: ['discovery', 'nearby'] as const,
};

export function useNearbyProfiles(enabled: boolean) {
  return useQuery({
    queryKey: discoveryKeys.nearby,
    enabled,
    queryFn: async () => {
      const { data, error } = await createClient().rpc('discover_nearby', { p_limit: 60 });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000, // server má rate limit – nefetchuj zbytočne
  });
}

export function useSyncLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await updateMyLocation(await getCoarsePosition());
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: discoveryKeys.nearby }),
  });
}
