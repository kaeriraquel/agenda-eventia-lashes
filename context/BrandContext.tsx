// context/BrandContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ServiceModule = 'lashes' | 'nails';

type BrandState = {
  brandName: string;
  logoUri: string | null;
  enabledServices: ServiceModule[];
};

type BrandContextValue = BrandState & {
  setBrandName: (name: string) => void;
  setLogoUri: (uri: string | null) => void;
  setEnabledServices: (services: ServiceModule[]) => void;
  toggleService: (service: ServiceModule) => void;
  resetBrand: () => void;
};

const STORAGE_KEY = 'agenda_eventia_brand_v1';

const DEFAULT_BRAND: BrandState = {
  brandName: 'Beauty Lashes RG',
  logoUri: null,
  enabledServices: ['lashes'],
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandName, setBrandNameState] = useState(DEFAULT_BRAND.brandName);
  const [logoUri, setLogoUriState] = useState<string | null>(DEFAULT_BRAND.logoUri);
  const [enabledServices, setEnabledServicesState] = useState<ServiceModule[]>(DEFAULT_BRAND.enabledServices);
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
      JSON.stringify({ brandName, logoUri, enabledServices })
    ).catch(e => console.error('Error guardando BrandContext', e));
  }, [brandName, logoUri, enabledServices, loaded]);

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
  };

  return (
    <BrandContext.Provider
      value={{
        brandName,
        logoUri,
        enabledServices,
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
