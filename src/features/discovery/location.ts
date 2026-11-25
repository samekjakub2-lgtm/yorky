import * as Location from 'expo-location';

import { supabase } from '@/lib/supabase';

/**
 * Pred odoslaním na server zaokrúhlime súradnice na 3 desatinné miesta (~100 m),
 * aby presná poloha neopustila zariadenie. Server ju ďalej zaokrúhli na mriežku ~500 m.
 */
export function coarsenCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function syncMyLocation(): Promise<void> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { error } = await supabase.rpc('update_my_location', {
    lat: coarsenCoordinate(position.coords.latitude),
    lng: coarsenCoordinate(position.coords.longitude),
  });
  if (error) throw error;
  // Súradnice nikdy nelogujeme ani neukladáme lokálne.
}
