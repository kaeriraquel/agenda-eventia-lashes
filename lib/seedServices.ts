// lib/seedServices.ts
import { supabase } from './supabase';

const LASHES_SEED = [
  'Extensiones clásicas 1x1',
  'Extensiones híbridas',
  'Extensiones volumen',
  'Extensiones mega volumen',
  'Lifting de pestañas',
  'Laminado de ceja',
  'Lifting + laminado de ceja',
  'Retoque de pestañas',
  'Retiro de extensiones',
];

const NAILS_SEED = [
  'Gel semipermanente',
  'Acrílico',
  'Polygel',
  'Baño de acrílico',
  'Tip / Escultural',
  'Relleno',
  'Retiro',
  'Nail art',
];

export async function seedDefaultServicesForUser(params: {
  userId: string;
  enabledServices: Array<'lashes' | 'nails'>;
}) {
  const { userId, enabledServices } = params;

  if (!userId) return;

  // 1) si ya hay servicios "servicio" para el usuario, no sembramos
  const { data: existing, error: checkErr } = await supabase
    .from('services')
    .select('id')
    .eq('user_id', userId)
    .eq('category', 'servicio')
    .limit(1);

  if (checkErr) throw checkErr;
  if (existing && existing.length > 0) return; // ya sembrado

  // 2) construir rows a insertar SOLO de los módulos activados
  const rows: any[] = [];

  if (enabledServices.includes('lashes')) {
    LASHES_SEED.forEach((name, idx) => {
      rows.push({
        user_id: userId,
        name,
        category: 'servicio',
        module: 'lashes',
        is_active: true,
        sort_order: idx + 1,
      });
    });
  }

  if (enabledServices.includes('nails')) {
    NAILS_SEED.forEach((name, idx) => {
      rows.push({
        user_id: userId,
        name,
        category: 'servicio',
        module: 'nails',
        is_active: true,
        sort_order: idx + 1,
      });
    });
  }

  if (rows.length === 0) return;

  const { error: insErr } = await supabase.from('services').insert(rows);
  if (insErr) throw insErr;
}