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

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const dayNameShort = (d: Date) => DAYS_SHORT[d.getDay()];
export const monthName = (m: number) => MONTHS[m];

/** "jueves 20 de noviembre" */
export function formatLongDate(key: string): string {
  const d = parseDateKey(key);
  if (isNaN(d.getTime())) return key;
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "20 nov" */
export function formatShortDate(key: string): string {
  const d = parseDateKey(key);
  if (isNaN(d.getTime())) return key;
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "Hoy", "Mañana", "Ayer" o "jue 20 nov" */
export function relativeDayLabel(key: string): string {
  const today = todayKey();
  if (key === today) return 'Hoy';
  if (key === addDays(today, 1)) return 'Mañana';
  if (key === addDays(today, -1)) return 'Ayer';
  const d = parseDateKey(key);
  if (isNaN(d.getTime())) return key;
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** Suma días a "YYYY-MM-DD" */
export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toLocalDateKey(d);
}

/** Días entre dos fechas "YYYY-MM-DD" (b - a) */
export function daysBetween(a: string, b: string): number {
  const da = parseDateKey(a).getTime();
  const db = parseDateKey(b).getTime();
  return Math.round((db - da) / 86400000);
}

/** Lunes de la semana de esa fecha */
export function startOfWeek(key: string): string {
  const d = parseDateKey(key);
  const dow = (d.getDay() + 6) % 7; // lunes=0
  d.setDate(d.getDate() - dow);
  return toLocalDateKey(d);
}

/** "10:30" -> "10:30 a. m." */
export function formatTime12(t: string): string {
  const [h, m] = (t || '').split(':').map(Number);
  if (isNaN(h)) return t;
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}
