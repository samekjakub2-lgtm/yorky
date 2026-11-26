/**
 * Prístup k polohe cez API prehliadača. Neskôr sa dá nahradiť Capacitor pluginom
 * bez zmeny volajúceho kódu (CLAUDE.md – konvencie).
 */
export type Coordinates = { lat: number; lng: number };

/** Zaokrúhlenie na 3 desatinné miesta (~100 m) – presná poloha neopustí zariadenie. */
export function coarsenCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function getCoarsePosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('geolocation_unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: coarsenCoordinate(position.coords.latitude),
          lng: coarsenCoordinate(position.coords.longitude),
        }),
      (error) =>
        reject(new Error(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')),
      // Bez vysokej presnosti a bez cache – polohu nikde neukladáme.
      { enableHighAccuracy: false, maximumAge: 0, timeout: 15_000 },
    );
  });
}
