// lib/dates.ts
// Fechas en hora LOCAL del teléfono.
// No usar toISOString() para sacar "YYYY-MM-DD": convierte a UTC y en
// México (UTC-6) después de las 6 pm devuelve el día siguiente.

/** Date -> "YYYY-MM-DD" en hora local */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" -> Date a medianoche LOCAL (new Date("YYYY-MM-DD") la toma como UTC) */
export function parseDateKey(key: string): Date {
  const [y, m, d] = (key || '').split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Hoy como "YYYY-MM-DD" local */
export function todayKey(): string {
  return toLocalDateKey(new Date());
}
