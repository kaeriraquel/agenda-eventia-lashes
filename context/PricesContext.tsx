// context/PricesContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useBrand } from './BrandContext';

export type PriceCategory = 'servicio' | 'producto';
export type ServiceModule = 'lashes' | 'nails';

export interface PriceItem {
  id: string;
  name: string;
  category: PriceCategory;
  module: ServiceModule | null; // ✅
  price: number;
}

interface PricesContextValue {
  items: PriceItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (data: {
    name: string;
    category: PriceCategory;
    module: ServiceModule | null;
    price: number;
  }) => Promise<void>;
  updateItem: (id: string, updates: Partial<PriceItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'agenda_eventia_prices_v2';

// Defaults SOLO para SIN SESIÓN (local)
const defaultPrices: PriceItem[] = [
  { id: 'svc1', name: 'Extensiones clásicas 1x1', category: 'servicio', module: 'lashes', price: 450 },
  { id: 'svc2', name: 'Extensiones híbridas', category: 'servicio', module: 'lashes', price: 520 },
  { id: 'svc3', name: 'Extensiones volumen', category: 'servicio', module: 'lashes', price: 600 },
  { id: 'svc4', name: 'Lifting de pestañas', category: 'servicio', module: 'lashes', price: 350 },

  { id: 'n1', name: 'Gel semipermanente', category: 'servicio', module: 'nails', price: 350 },
  { id: 'n2', name: 'Acrílico', category: 'servicio', module: 'nails', price: 500 },

  { id: 'prd1', name: 'Shampoo de pestañas', category: 'producto', module: null, price: 180 },
];

type DbServiceRow = {
  id: string;
  user_id: string;
  name: string;
  price: number | string | null;
  is_active: boolean;
  category: PriceCategory;
  module: ServiceModule | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

function dbToApp(row: DbServiceRow): PriceItem {
  const p =
    row.price == null ? 0 : typeof row.price === 'string' ? Number(row.price) : row.price;

  return {
    id: row.id,
    name: row.name,
    category: row.category ?? 'servicio',
    module: row.category === 'producto' ? null : (row.module ?? null),
    price: isNaN(p) ? 0 : p,
  };
}

const PricesContext = createContext<PricesContextValue | undefined>(undefined);

/**
 * ✅ Seed de servicios base A LA BD (por usuario) — SOLO si todavía no tiene servicios.
 * Respeta enabledServices (si no activó nails, no insertamos nails).
 */
async function seedDefaultServicesIfEmpty(params: {
  userId: string;
  enabledServices: ServiceModule[];
}) {
  const { userId, enabledServices } = params;
  if (!userId) return;

  // ¿Ya tiene servicios activos?
  const { data: existing, error: checkErr } = await supabase
    .from('services')
    .select('id')
    .eq('user_id', userId)
    .eq('category', 'servicio')
    .eq('is_active', true)
    .limit(1);

  if (checkErr) throw checkErr;
  if (existing && existing.length > 0) return; // ya hay servicios => NO sembrar

  // Base (los que tú quieres que vivan en DB)
  const lashesSeed = [
    { name: 'Extensiones clásicas 1x1', price: 450 },
    { name: 'Extensiones híbridas', price: 520 },
    { name: 'Extensiones volumen', price: 600 },
    { name: 'Extensiones mega volumen', price: 650 },
    { name: 'Lifting de pestañas', price: 350 },
    { name: 'Laminado de ceja', price: 300 },
    { name: 'Lifting + laminado de ceja', price: 550 },
    { name: 'Retoque de pestañas', price: 350 },
    { name: 'Retiro de extensiones', price: 150 },
  ];

  const nailsSeed = [
    { name: 'Gel semipermanente', price: 350 },
    { name: 'Acrílico', price: 500 },
    { name: 'Polygel', price: 500 },
    { name: 'Baño de acrílico', price: 400 },
    { name: 'Tip / Escultural', price: 550 },
    { name: 'Relleno', price: 350 },
    { name: 'Retiro', price: 150 },
    { name: 'Nail art', price: 100 },
  ];

  const rows: any[] = [];

  if (enabledServices.includes('lashes')) {
    lashesSeed.forEach((s, idx) => {
      rows.push({
        user_id: userId,
        name: s.name,
        price: s.price,
        is_active: true,
        category: 'servicio',
        module: 'lashes',
        sort_order: idx + 1,
      });
    });
  }

  if (enabledServices.includes('nails')) {
    nailsSeed.forEach((s, idx) => {
      rows.push({
        user_id: userId,
        name: s.name,
        price: s.price,
        is_active: true,
        category: 'servicio',
        module: 'nails',
        sort_order: idx + 1,
      });
    });
  }

  if (rows.length === 0) return;

  const { error: insErr } = await supabase.from('services').insert(rows);
  if (insErr) throw insErr;
}

export function PricesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { enabledServices } = useBrand(); // ✅ para respetar lashes/nails
  const isPro = !!user?.id;

  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);
    try {
      if (isPro && user?.id) {
        // ✅ 1) Sembrar defaults en BD si está vacío
        await seedDefaultServicesIfEmpty({
          userId: user.id,
          enabledServices: (enabledServices ?? ['lashes']) as ServiceModule[],
        });

        // ✅ 2) Leer desde BD (ya sea los sembrados o los que el usuario tenga)
        const { data, error } = await supabase
          .from('services')
          .select('id,user_id,name,price,is_active,category,module,sort_order,created_at,updated_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('module', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;

        // ✅ 3) Filtrar por módulos habilitados (si desactivó nails, no mostrar nails)
        const filtered = (data ?? []).filter((row: DbServiceRow) => {
          if (row.category === 'producto') return true; // productos no dependen del módulo
          if (!row.module) return true;
          return (enabledServices ?? ['lashes']).includes(row.module);
        });

        setItems(filtered.map(dbToApp));
      } else {
        // GRATIS: local
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored));
        else setItems(defaultPrices);
      }
    } catch (e) {
      console.error('Error refrescando precios:', e);
      if (!isPro) setItems(defaultPrices);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isPro, user?.id, enabledServices]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Guardar SOLO en local cuando no hay sesión
  useEffect(() => {
    if (authLoading) return;
    if (isPro) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(e =>
      console.error('Error guardando precios local:', e)
    );
  }, [items, authLoading, isPro]);

  const addItem = useCallback(
    async (data: { name: string; category: PriceCategory; module: ServiceModule | null; price: number }) => {
      const name = data.name.trim();
      if (!name) return;

      const finalModule = data.category === 'producto' ? null : data.module;
      if (data.category === 'servicio' && !finalModule) {
        throw new Error('Selecciona si el servicio es de pestañas (lashes) o uñas (nails).');
      }

      if (isPro && user?.id) {
        const { data: inserted, error } = await supabase
          .from('services')
          .insert({
            user_id: user.id,
            name,
            price: data.price,
            is_active: true,
            category: data.category,
            module: finalModule,
            sort_order: 0,
          })
          .select('id,user_id,name,price,is_active,category,module,sort_order,created_at,updated_at')
          .single();

        if (error) throw error;

        setItems(prev => [...prev, dbToApp(inserted as DbServiceRow)]);
        return;
      }

      // local
      setItems(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          name,
          category: data.category,
          module: finalModule,
          price: data.price,
        },
      ]);
    },
    [isPro, user?.id]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<PriceItem>) => {
      if (isPro && user?.id) {
        const patch: any = {};
        if (updates.name !== undefined) patch.name = updates.name.trim();
        if (updates.price !== undefined) patch.price = updates.price;
        if (updates.category !== undefined) patch.category = updates.category;

        // si cambia a producto -> module null
        if (updates.category === 'producto') {
          patch.module = null;
        } else if (updates.module !== undefined) {
          patch.module = updates.module;
        }

        if (patch.category === 'servicio' && patch.module == null) {
          throw new Error('Selecciona lashes o nails.');
        }

        const { data: updated, error } = await supabase
          .from('services')
          .update(patch)
          .eq('id', id)
          .eq('user_id', user.id)
          .select('id,user_id,name,price,is_active,category,module,sort_order,created_at,updated_at')
          .single();

        if (error) throw error;

        const mapped = dbToApp(updated as DbServiceRow);
        setItems(prev => prev.map(i => (i.id === id ? mapped : i)));
        return;
      }

      // local
      setItems(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)));
    },
    [isPro, user?.id]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (isPro && user?.id) {
        // desactivar (mejor que borrar)
        const { error } = await supabase
          .from('services')
          .update({ is_active: false })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        setItems(prev => prev.filter(i => i.id !== id));
        return;
      }

      // local
      setItems(prev => prev.filter(i => i.id !== id));
    },
    [isPro, user?.id]
  );

  const value = useMemo(
    () => ({ items, loading, refresh, addItem, updateItem, deleteItem }),
    [items, loading, refresh, addItem, updateItem, deleteItem]
  );

  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>;
}

export function usePrices() {
  const ctx = useContext(PricesContext);
  if (!ctx) throw new Error('usePrices debe usarse dentro de PricesProvider');
  return ctx;
}