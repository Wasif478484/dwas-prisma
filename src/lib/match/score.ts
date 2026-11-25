// DWAS spec §7.2 — pure ranking maths. No I/O, no Firebase imports.
export const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Bayesian prior C=5, prior mean 4.0 on the 1–5 star scale (§7.2).
export function bayesianRating(sum: number, count: number, prior = 4, weight = 5): number {
  return (sum + weight * prior) / (count + weight);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// Displayed distance is rounded to the nearest half kilometre; exact
// coordinates never leave this module.
export function roundDistance(km: number): number {
  return Math.round(km * 2) / 2;
}
