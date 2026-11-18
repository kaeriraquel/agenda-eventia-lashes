// context/AppointmentsContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';


export type AppointmentStatus =
  | 'pendiente'
  | 'realizada'
  | 'cancelada'
  | 'no_asistio';

export type LashesTechnicalSheet = {
  kind: 'lashes';
  applicationType: string;
  eyeShape: string;
  curl: string;
  lengths: string;
  thickness: string;
  design: string;
  adhesive: string;
  notes?: string;
};

export type NailsTechnicalSheet = {
  kind: 'nails';
  technique: string;        // Gel / Acrílico / Polygel...
  shape: string;            // Almond, square...
  length: string;           // Cortas/Medias/Largas o “#2/#3”
  color: string;            // Color principal / tonos
  design: string;           // Nail art / french / etc.
  finish: string;           // Mate/Brillante
  removal: boolean;         // ¿hubo retiro?
  notes?: string;
};

export type TechnicalSheet = LashesTechnicalSheet | NailsTechnicalSheet;

export type ServiceModule = 'lashes' | 'nails';

export interface Appointment {
  id: string;
  clientId?: string | null; // ✅ NUEVO
  clientName: string;
  service: string;
  date: string;
  time: string;
  phone?: string;
  notes?: string;
  price?: number | null;
  status: AppointmentStatus;
  technicalSheet?: TechnicalSheet | null;
  mappingLeft?: string | null;
  mappingRight?: string | null;
  module?: ServiceModule; // si ya lo estás usando
}


interface AppointmentsContextValue {
  appointments: Appointment[];
  loading: boolean;

  // ✅ IMPORTANTE: para que config/import pueda refrescar sin logout/login
  refreshAppointments: () => Promise<void>;

  addAppointment: (data: {
    date: string;
    time: string;
    clientName: string;
    clientId?: string | null; // ✅ AGREGAR
    service: string;
    notes?: string;
    phone?: string;
    price?: number | null;
    module?: ServiceModule;
  }) => Promise<void>;

  updateAppointment: (
    id: string,
    updates: Partial<Appointment>
  ) => Promise<void>;

  deleteAppointment: (id: string) => Promise<void>;

  getAppointmentsByDate: (date: string) => Appointment[];
}

const STORAGE_KEY = 'agenda_eventia_appointments_v1';

const AppointmentsContext = createContext<AppointmentsContextValue | undefined>(
  undefined
);

/** ===== DB <-> APP ===== */
type DbAppointment = {
  id: string;
  user_id: string;
  client_id: string | null; // ✅ NUEVO
  client_name: string;
  phone: string | null;
  service_name: string;
  date: string;
  time: string;
  notes: string | null;
  price: number | null;
  status: string;
  technical_sheet: any | null;
  mapping_left: string | null;
  mapping_right: string | null;
  module: string | null; // si existe
};

function dbToApp(row: DbAppointment): Appointment {
  return {
    id: row.id,
    clientId: row.client_id, // ✅ NUEVO
    clientName: row.client_name,
    phone: row.phone ?? '',
    service: row.service_name,
    date: row.date,
    time: row.time,
    notes: row.notes ?? '',
    price: row.price ?? null,
    status: (row.status as AppointmentStatus) ?? 'pendiente',
    technicalSheet: (row.technical_sheet as TechnicalSheet) ?? null,
    mappingLeft: row.mapping_left ?? null,
    mappingRight: row.mapping_right ?? null,
    module: (row.module as any) ?? 'lashes',
  };
}

function appToDbInsert(userId: string, appt: Omit<Appointment, 'id'>) {
  return {
    user_id: userId,
    client_id: appt.clientId ?? null, // ✅ NUEVO
    client_name: appt.clientName,
    phone: appt.phone ?? null,
    service_name: appt.service,
    date: appt.date,
    time: appt.time,
    notes: appt.notes ?? null,
    price: appt.price ?? null,
    status: appt.status ?? 'pendiente',
    technical_sheet: appt.technicalSheet ?? null,
    mapping_left: appt.mappingLeft ?? null,
    mapping_right: appt.mappingRight ?? null,
    module: (appt.module as any) ?? 'lashes',
  };
}

function appToDbUpdate(updates: Partial<Appointment>) {
  return {
    client_id: updates.clientId === undefined ? undefined : updates.clientId ?? null,
    client_name: updates.clientName,
    phone: updates.phone === undefined ? undefined : updates.phone ?? null,
    service_name: updates.service,
    date: updates.date,
    time: updates.time,
    notes: updates.notes === undefined ? undefined : updates.notes ?? null,
    price: updates.price === undefined ? undefined : updates.price ?? null,
    status: updates.status,
    technical_sheet:
      updates.technicalSheet === undefined ? undefined : updates.technicalSheet ?? null,
    mapping_left:
      updates.mappingLeft === undefined ? undefined : updates.mappingLeft ?? null,
    mapping_right:
      updates.mappingRight === undefined ? undefined : updates.mappingRight ?? null,
    module: updates.module === undefined ? undefined : updates.module ?? 'lashes',
  };
}

/** ===== Provider ===== */
export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const isPro = !!user?.id;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ REFRESH CENTRALIZADO (esto es lo que evita “tengo que cerrar sesión para ver”)
  const refreshAppointments = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);
    try {
      if (isPro && user?.id) {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true })
          .order('time', { ascending: true });

        if (error) throw error;

        setAppointments((data as DbAppointment[]).map(dbToApp));
      } else {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        setAppointments(stored ? JSON.parse(stored) : []);
      }
    } catch (e) {
      console.error('Error refrescando citas:', e);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isPro, user?.id]);

  // 1) Cargar al arrancar y cuando cambie user/modo
  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  // 2) Guardar en AsyncStorage SOLO en modo Gratis
  useEffect(() => {
    if (authLoading) return;
    if (isPro) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(appointments)).catch(e =>
      console.error('Error guardando citas (local):', e)
    );
  }, [appointments, authLoading, isPro]);

  // 3) Add
  async function addAppointment(data: {
    date: string;
    time: string;
    clientName: string;
    clientId?: string | null;
    service: string;
    notes?: string;
    phone?: string;
    price?: number | null;
    module?: ServiceModule;
  }) {
    const payload: Omit<Appointment, 'id'> = {
      clientId: data.clientId ?? null, // ✅ NUEVO
      date: data.date,
      time: data.time,
      clientName: data.clientName,
      phone: data.phone ?? '',
      service: data.service,
      notes: data.notes ?? '',
      price: data.price ?? null,
      status: 'pendiente',
      technicalSheet: null,
      mappingLeft: null,
      mappingRight: null,
      module: data.module ?? 'lashes',
    };


    // PRO: insertar en Supabase y agregar al state
    if (isPro && user?.id) {
      const { data: inserted, error } = await supabase
        .from('appointments')
        .insert(appToDbInsert(user.id, payload))
        .select('*')
        .single();

      if (error) {
        console.error('Error insert supabase:', error);
        return;
      }

      const newAppt = dbToApp(inserted as DbAppointment);
      setAppointments(prev => [...prev, newAppt]);
      return;
    }

    // GRATIS: insertar local
    const localAppt: Appointment = { id: Date.now().toString(), ...payload };
    setAppointments(prev => [...prev, localAppt]);
  }

  // 4) Update
  async function updateAppointment(id: string, updates: Partial<Appointment>) {
    // PRO: update en supabase + actualizar state
    if (isPro && user?.id) {
      const dbUpdates = appToDbUpdate(updates);

      const { data: updated, error } = await supabase
        .from('appointments')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) {
        console.error('Error update supabase:', error);
        return;
      }

      const updatedAppt = dbToApp(updated as DbAppointment);
      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, ...updatedAppt } : a))
      );
      return;
    }

    // GRATIS: update local
    setAppointments(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
  }

  async function deleteAppointment(id: string) {
    // PRO: delete en supabase + actualizar state
    if (isPro && user?.id) {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error delete supabase:', error);
        return;
      }

      setAppointments(prev => prev.filter(a => a.id !== id));
      return;
    }

    // GRATIS: delete local
    setAppointments(prev => prev.filter(a => a.id !== id));
  }


  function getAppointmentsByDate(date: string) {
    return appointments
      .filter(appt => appt.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  const value = useMemo(
    () => ({
      appointments,
      loading,
      refreshAppointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      getAppointmentsByDate,
    }),
    [appointments, loading, refreshAppointments]
  );

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(AppointmentsContext);
  if (!ctx) throw new Error('useAppointments debe usarse dentro de AppointmentsProvider');
  return ctx;
}
