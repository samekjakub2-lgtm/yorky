import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { syncMyLocation } from '@/features/discovery/location';
import { supabase } from '@/lib/supabase';

export const discoveryKeys = {
  nearby: ['discovery', 'nearby'] as const,
};

export function useNearbyProfiles() {
  return useQuery({
    queryKey: discoveryKeys.nearby,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('discover_nearby', { p_limit: 60 });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000, // server má rate limit – nefetchuj zbytočne
  });
}

export function useSyncLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncMyLocation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: discoveryKeys.nearby }),
  });
}
