import { z } from 'zod';

export type ActionError =
  'invalid_input' | 'not_authenticated' | 'not_allowed' | 'rate_limited' | 'generic';
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ActionError };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: ActionError): ActionResult<never> => ({ ok: false, error });

/**
 * Preloží chybu Postgres/Supabase na kód pre UI. Nikdy nelogujeme obsah požiadavky
 * ani osobné údaje – iba kód chyby (CLAUDE.md, pravidlo 7).
 */
export function fromDbError(error: { code?: string } | null): ActionError {
  switch (error?.code) {
    case 'P0429':
      return 'rate_limited';
    case '42501':
      return 'not_allowed';
    case '22023':
    case '23514':
      return 'invalid_input';
    default:
      return 'generic';
  }
}

export const UuidSchema = z.uuid();
