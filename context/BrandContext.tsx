// context/BrandContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ServiceModule = 'lashes' | 'nails';

type BrandState = {
  brandName: string;
  logoUri: string | null;
  enabledServices: ServiceModule[];
  // Recordatorios por WhatsApp
  reminderTemplate: string;
  retouchTemplate: string;
  retouchDays: number; // cada cuántos días sugerir retoque
};

// Variables disponibles: {nombre} {fecha} {hora} {servicio} {negocio} {dias}
export const DEFAULT_REMINDER_TEMPLATE =
  'Hola {nombre} 💕 te recuerdo tu cita de {servicio} el {fecha} a las {hora} en {negocio}. ¿Me confirmas tu asistencia? ✨';
export const DEFAULT_RETOUCH_TEMPLATE =
  'Hola {nombre} 💕 ya pasaron {dias} días desde tu último servicio de {servicio}. ¿Te agendo tu retoque esta semana? ✨ — {negocio}';

type BrandContextValue = BrandState & {
  setReminderTemplate: (t: string) => void;
  setRetouchTemplate: (t: string) => void;
  setRetouchDays: (d: number) => void;
  setBrandName: (name: string) => void;
  setLogoUri: (uri: string | null) => void;
  setEnabledServices: (services: ServiceModule[]) => void;
  toggleService: (service: ServiceModule) => void;
  resetBrand: () => void;
};

const STORAGE_KEY = 'agenda_eventia_brand_v1';

const DEFAULT_BRAND: BrandState = {
  brandName: 'Mi estudio',
  logoUri: null,
  enabledServices: ['lashes'],
  reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
  retouchTemplate: DEFAULT_RETOUCH_TEMPLATE,
  retouchDays: 21,
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandName, setBrandNameState] = useState(DEFAULT_BRAND.brandName);
  const [logoUri, setLogoUriState] = useState<string | null>(DEFAULT_BRAND.logoUri);
  const [enabledServices, setEnabledServicesState] = useState<ServiceModule[]>(DEFAULT_BRAND.enabledServices);
  const [reminderTemplate, setReminderTemplate] = useState(DEFAULT_BRAND.reminderTemplate);
  const [retouchTemplate, setRetouchTemplate] = useState(DEFAULT_BRAND.retouchTemplate);
  const [retouchDays, setRetouchDaysState] = useState(DEFAULT_BRAND.retouchDays);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<BrandState>;
          setBrandNameState(parsed.brandName ?? DEFAULT_BRAND.brandName);
          setLogoUriState(parsed.logoUri ?? DEFAULT_BRAND.logoUri);

          const list = parsed.enabledServices;
          setEnabledServicesState(
            Array.isArray(list) && list.length > 0 ? (list as ServiceModule[]) : DEFAULT_BRAND.enabledServices
          );
          setReminderTemplate(parsed.reminderTemplate || DEFAULT_BRAND.reminderTemplate);
          setRetouchTemplate(parsed.retouchTemplate || DEFAULT_BRAND.retouchTemplate);
          setRetouchDaysState(
            typeof parsed.retouchDays === 'number' && parsed.retouchDays > 0
              ? parsed.retouchDays
              : DEFAULT_BRAND.retouchDays
          );
        }
      } catch (e) {
        console.error('Error cargando BrandContext', e);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        brandName,
        logoUri,
        enabledServices,
        reminderTemplate,
        retouchTemplate,
        retouchDays,
      })
    ).catch(e => console.error('Error guardando BrandContext', e));
  }, [brandName, logoUri, enabledServices, reminderTemplate, retouchTemplate, retouchDays, loaded]);

  const setRetouchDays = (d: number) => {
    if (!d || d < 1 || d > 120) return;
    setRetouchDaysState(Math.round(d));
  };

  const setBrandName = (name: string) => setBrandNameState(name);
  const setLogoUri = (uri: string | null) => setLogoUriState(uri);

  const setEnabledServices = (services: ServiceModule[]) => {
    if (!services || services.length === 0) return; // mínimo 1 activo
    setEnabledServicesState(services);
  };

  const toggleService = (service: ServiceModule) => {
    setEnabledServicesState(prev => {
      const has = prev.includes(service);
      const next = has ? prev.filter(s => s !== service) : [...prev, service];
      return next.length === 0 ? prev : next; // no permitir vacío
    });
  };

  const resetBrand = () => {
    setBrandNameState(DEFAULT_BRAND.brandName);
    setLogoUriState(DEFAULT_BRAND.logoUri);
    setEnabledServicesState(DEFAULT_BRAND.enabledServices);
    setReminderTemplate(DEFAULT_BRAND.reminderTemplate);
    setRetouchTemplate(DEFAULT_BRAND.retouchTemplate);
    setRetouchDaysState(DEFAULT_BRAND.retouchDays);
  };

  return (
    <BrandContext.Provider
      value={{
        brandName,
        logoUri,
        enabledServices,
        reminderTemplate,
        retouchTemplate,
        retouchDays,
        setReminderTemplate,
        setRetouchTemplate,
        setRetouchDays,
        setBrandName,
        setLogoUri,
        setEnabledServices,
        toggleService,
        resetBrand,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand debe usarse dentro de BrandProvider');
  return ctx;
}
