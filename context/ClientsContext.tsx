// context/ClientsContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { normalizePhone } from '../lib/phone';

export type Client = {
  id: string;
  name: string;
  phone?: string | null;
  phone_normalized?: string | null; // ✅
  notes?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

type DbClient = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  phone_normalized: string | null; // ✅
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

type ClientsContextValue = {
  clients: Client[];
  loading: boolean;
  refreshClients: () => Promise<void>;
  addClient: (data: {
    name: string;
    phone?: string;
    notes?: string;
    tags?: string[];
  }) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Omit<Client, 'id'>>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  findClientById: (id: string) => Client | undefined;
};

const ClientsContext = createContext<ClientsContextValue | undefined>(undefined);

function dbToApp(row: DbClient): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    phone_normalized: row.phone_normalized, // ✅
    notes: row.notes,
    tags: row.tags,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function ClientsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const isPro = !!user?.id;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshClients = useCallback(async () => {
    if (authLoading) return;

    if (!isPro || !user?.id) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data as DbClient[]).map(dbToApp));
    } catch (e) {
      console.error('Error cargando clients:', e);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isPro, user?.id]);

  useEffect(() => {
    refreshClients();
  }, [refreshClients]);

  const addClient = useCallback(
    async (data: { name: string; phone?: string; notes?: string; tags?: string[] }) => {
      if (!user?.id) return null;

      const name = data.name.trim();
      const phone = (data.phone ?? '').trim();
      const phoneNorm = normalizePhone(phone);

      if (!name) return null;

      try {
        // ✅ Si hay teléfono, usamos UPSERT para evitar duplicados
        if (phoneNorm) {
          const { data: upserted, error } = await supabase
            .from('clients')
            .upsert(
              {
                user_id: user.id,
                name,
                phone,
                phone_normalized: phoneNorm,
                notes: data.notes?.trim() || null,
                tags: data.tags ?? null,
              },
              { onConflict: 'user_id,phone_normalized' }
            )
            .select('*')
            .single();

          if (error) throw error;

          const c = dbToApp(upserted as DbClient);
          setClients(prev => {
            const exists = prev.some(x => x.id === c.id);
            return exists ? prev.map(x => (x.id === c.id ? { ...x, ...c } : x)) : [c, ...prev];
          });

          return c;
        }

        // ✅ Sin teléfono: insert normal (puede duplicar por nombre y está OK)
        const { data: inserted, error } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            name,
            phone: null,
            phone_normalized: null,
            notes: data.notes?.trim() || null,
            tags: data.tags ?? null,
          })
          .select('*')
          .single();

        if (error) throw error;

        const c = dbToApp(inserted as DbClient);
        setClients(prev => [c, ...prev]);
        return c;
      } catch (e) {
        console.error('Error addClient:', e);
        return null;
      }
    },
    [user?.id]
  );

  const updateClient = useCallback(
    async (id: string, updates: Partial<Omit<Client, 'id'>>) => {
      if (!user?.id) return;

      const phone = updates.phone === undefined ? undefined : (updates.phone ?? '').trim();
      const phoneNorm = phone === undefined ? undefined : normalizePhone(phone);

      const dbUpdates: any = {
        name: updates.name,
        phone: updates.phone === undefined ? undefined : phone || null,
        phone_normalized: updates.phone === undefined ? undefined : phoneNorm || null,
        notes: updates.notes === undefined ? undefined : updates.notes ?? null,
        tags: updates.tags === undefined ? undefined : updates.tags ?? null,
      };

      try {
        const { data: updated, error } = await supabase
          .from('clients')
          .update(dbUpdates)
          .eq('id', id)
          .eq('user_id', user.id)
          .select('*')
          .single();

        if (error) throw error;

        const c = dbToApp(updated as DbClient);
        setClients(prev => prev.map(x => (x.id === id ? { ...x, ...c } : x)));
      } catch (e) {
        console.error('Error updateClient:', e);
      }
    },
    [user?.id]
  );

  const deleteClient = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      try {
        const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', user.id);
        if (error) throw error;
        setClients(prev => prev.filter(c => c.id !== id));
      } catch (e) {
        console.error('Error deleteClient:', e);
      }
    },
    [user?.id]
  );

  const findClientById = (id: string) => clients.find(c => c.id === id);

  const value = useMemo(
    () => ({
      clients,
      loading,
      refreshClients,
      addClient,
      updateClient,
      deleteClient,
      findClientById,
    }),
    [clients, loading, refreshClients, addClient, updateClient, deleteClient]
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error('useClients debe usarse dentro de ClientsProvider');
  return ctx;
}
