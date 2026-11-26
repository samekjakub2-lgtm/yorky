'use client';

import { useFormatter } from 'next-intl';

/**
 * Čas správy v jazyku aplikácie a časovom pásme zariadenia: dnes iba hodiny,
 * inak dátum. Dáta chatu sa načítavajú iba v klientovi, takže nehrozí rozdiel
 * medzi pásmom servera a prehliadača.
 */
export function useMessageTime() {
  const format = useFormatter();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (iso: string) => {
    const date = new Date(iso);
    const isToday = date.toDateString() === new Date().toDateString();
    return isToday
      ? format.dateTime(date, { hour: '2-digit', minute: '2-digit', timeZone })
      : format.dateTime(date, { day: 'numeric', month: 'numeric', timeZone });
  };
}
