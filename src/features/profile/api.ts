'use client';

import { useQuery } from '@tanstack/react-query';

import { stripMetadataAndResize } from '@/lib/platform/images';
import { createClient, PROFILE_PHOTOS_BUCKET } from '@/lib/supabase/client';

export const profileKeys = {
  mine: ['profile', 'mine'] as const,
  detail: (id: string) => ['profile', id] as const,
};

export function useMyProfile() {
  return useQuery({
    queryKey: profileKeys.mine,
    queryFn: async () => {
      const { data, error } = await createClient().from('profiles').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Cudzí profil – iba cez RPC (vracia pásmo vzdialenosti, nikdy polohu). */
export function useProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: async () => {
      const { data, error } = await createClient().rpc('get_profile', { p_user_id: userId });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

/**
 * Nahrá fotku do privátneho bucketu. Súbor sa najprv prekóduje (bez EXIF/GPS) –
 * pôvodný súbor zo zariadenia sa nikdy nenahráva.
 */
export async function uploadProfilePhoto(userId: string, file: File, position: number) {
  const supabase = createClient();
  const clean = await stripMetadataAndResize(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, clean, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase
    .from('profile_photos')
    .upsert({ user_id: userId, storage_path: path, position }, { onConflict: 'user_id,position' });
  if (rowError) throw rowError;
  return path;
}

/** Podpísané URL s krátkou platnosťou (bucket je privátny). Nikdy ich necachuj v SW. */
export async function getSignedPhotoUrls(paths: string[], expiresInSeconds = 600) {
  if (paths.length === 0) return [];
  const { data, error } = await createClient()
    .storage.from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;
  return data;
}
