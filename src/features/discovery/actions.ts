'use server';

import { z } from 'zod';

import { type ActionResult, fail, fromDbError, ok } from '@/lib/action-result';
import { coarsenCoordinate } from '@/lib/platform/geolocation';
import { createClient } from '@/lib/supabase/server';

const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Uloží moju polohu. Súradnice sa ešte raz zaokrúhlia, server ich zaokrúhli na mriežku ~500 m.
 * Súradnice sa NIKDY nelogujú (ani pri chybe).
 */
export async function updateMyLocation(input: unknown): Promise<ActionResult> {
  const parsed = CoordinatesSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_input');

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_my_location', {
    lat: coarsenCoordinate(parsed.data.lat),
    lng: coarsenCoordinate(parsed.data.lng),
  });
  return error ? fail(fromDbError(error)) : ok(undefined);
}
