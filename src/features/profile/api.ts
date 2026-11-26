'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addMyPhoto, deleteMyPhoto } from '@/features/profile/actions';
import { stripMetadataAndResize } from '@/lib/platform/images';
import { createClient, PROFILE_PHOTOS_BUCKET } from '@/lib/supabase/client';

/** Platnosť podpísaných URL fotiek; v cache ich držíme kratšie, aby nevypršali na obrazovke. */
const SIGNED_URL_TTL_SECONDS = 600;
const SIGNED_URL_STALE_MS = 5 * 60_000;

export const profileKeys = {
  mine: ['profile', 'mine'] as const,
  myPhotos: ['profile', 'mine', 'photos'] as const,
  detail: (id: string) => ['profile', id] as const,
  signedUrls: (paths: readonly string[]) => ['photos', 'signed', ...paths] as const,
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

/** Moje fotky (RLS: iba vlastné riadky) zoradené podľa pozície; prvá je hlavná. */
export function useMyPhotos() {
  return useQuery({
    queryKey: profileKeys.myPhotos,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('profile_photos')
        .select('id, storage_path, position')
        .order('position');
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Podpísané URL pre zoznam ciest (jedna dávková požiadavka). Vracia mapu cesta → URL.
 * Bucket je privátny; URL žijú krátko a necachuje ich service worker.
 */
export function useSignedPhotoUrls(paths: readonly string[]) {
  const unique = [...new Set(paths)].sort();
  return useQuery({
    queryKey: profileKeys.signedUrls(unique),
    enabled: unique.length > 0,
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_STALE_MS,
    queryFn: async () => {
      const signed = await getSignedPhotoUrls(unique, SIGNED_URL_TTL_SECONDS);
      const map = new Map<string, string>();
      for (const item of signed) {
        if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
      }
      return map;
    },
  });
}

/**
 * Nahrá fotku do privátneho bucketu. Súbor sa najprv prekóduje (bez EXIF/GPS) –
 * pôvodný súbor zo zariadenia sa nikdy nenahráva. Riadok v DB zapíše Server Action.
 */
export async function uploadProfilePhoto(userId: string, file: File) {
  const supabase = createClient();
  const clean = await stripMetadataAndResize(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, clean, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw new Error('upload_failed');

  const result = await addMyPhoto(path);
  if (!result.ok) {
    // Bez riadku v DB by súbor ostal osirelý – uprac ho.
    await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([path]);
    throw new Error(result.error);
  }
  return path;
}

export function useUploadPhoto(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadProfilePhoto(userId, file),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.myPhotos }),
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: string) => {
      const result = await deleteMyPhoto(photoId);
      if (!result.ok) throw new Error(result.error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.myPhotos }),
  });
}

/** Podpísané URL s krátkou platnosťou (bucket je privátny). Nikdy ich necachuj v SW. */
export async function getSignedPhotoUrls(
  paths: string[],
  expiresInSeconds = SIGNED_URL_TTL_SECONDS,
) {
  if (paths.length === 0) return [];
  const { data, error } = await createClient()
    .storage.from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;
  return data;
}
