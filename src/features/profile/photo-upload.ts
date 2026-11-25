import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { PROFILE_PHOTOS_BUCKET, supabase } from '@/lib/supabase';

const MAX_DIMENSION = 1600;

/**
 * Prekódovanie cez ImageManipulator vytvorí nový JPEG bez EXIF metadát (vrátane GPS).
 * Nikdy nenahrávaj pôvodný súbor z galérie.
 */
export async function stripMetadataAndResize(uri: string, width: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (width > MAX_DIMENSION) context.resize({ width: MAX_DIMENSION });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return result.uri;
}

export async function pickAndUploadProfilePhoto(
  userId: string,
  position: number,
): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 1,
    exif: false,
  });
  if (picked.canceled || !picked.assets[0]) return null;

  const asset = picked.assets[0];
  const cleanUri = await stripMetadataAndResize(asset.uri, asset.width);
  const body = await (await fetch(cleanUri)).arrayBuffer();
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase
    .from('profile_photos')
    .upsert({ user_id: userId, storage_path: path, position }, { onConflict: 'user_id,position' });
  if (rowError) throw rowError;

  return path;
}

/** Podpísané URL s krátkou platnosťou (bucket je privátny). */
export async function getSignedPhotoUrls(paths: string[], expiresInSeconds = 600) {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;
  return data;
}
