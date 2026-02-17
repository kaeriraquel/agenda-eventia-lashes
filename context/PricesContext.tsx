// context/PricesContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PriceCategory = 'servicio' | 'producto';

export interface PriceItem {
  id: string;
  name: string;
  category: PriceCategory;
  price: number;
}

interface PricesContextValue {
  items: PriceItem[];
  addItem: (data: { name: string; category: PriceCategory; price: number }) => void;
  updateItem: (id: string, updates: Partial<PriceItem>) => void;
  deleteItem: (id: string) => void;
}

const STORAGE_KEY = 'agenda_eventia_prices_v1';

const PricesContext = createContext<PricesContextValue | undefined>(undefined);

const defaultPrices: PriceItem[] = [
  { id: 'svc1', name: 'Extensiones clásicas 1x1', category: 'servicio', price: 450 },
  { id: 'svc2', name: 'Extensiones híbridas', category: 'servicio', price: 520 },
  { id: 'svc3', name: 'Extensiones volumen', category: 'servicio', price: 600 },
  { id: 'svc4', name: 'Lifting de pestañas', category: 'servicio', price: 350 },
  { id: 'svc5', name: 'Laminado de ceja', category: 'servicio', price: 300 },
  { id: 'svc6', name: 'Lifting + laminado de ceja', category: 'servicio', price: 550 },
  { id: 'svc7', name: 'Retoque de pestañas', category: 'servicio', price: 350 },
  { id: 'svc8', name: 'Retiro de extensiones', category: 'servicio', price: 150 },

  // Ejemplos de productos
  { id: 'prd1', name: 'Shampoo de pestañas', category: 'producto', price: 180 },
  { id: 'prd2', name: 'Cepillitos para pestañas (kit)', category: 'producto', price: 60 },
];

export function PricesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadPrices() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: PriceItem[] = JSON.parse(stored);
          setItems(parsed);
        } else {
          setItems(defaultPrices);
        }
      } catch (e) {
        console.error('Error cargando precios desde AsyncStorage', e);
        setItems(defaultPrices);
      } finally {
        setLoaded(true);
      }
    }

    loadPrices();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    async function savePrices() {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Error guardando precios en AsyncStorage', e);
      }
    }
    savePrices();
  }, [items, loaded]);

  function addItem({
    name,
    category,
    price,
  }: {
    name: string;
    category: PriceCategory;
    price: number;
  }) {
    const newItem: PriceItem = {
      id: Date.now().toString(),
      name,
      category,
      price,
    };
    setItems(prev => [...prev, newItem]);
  }

  function updateItem(id: string, updates: Partial<PriceItem>) {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id));
  }

  return (
    <PricesContext.Provider value={{ items, addItem, updateItem, deleteItem }}>
      {children}
    </PricesContext.Provider>
  );
}

export function usePrices() {
  const ctx = useContext(PricesContext);
  if (!ctx) {
    throw new Error('usePrices debe usarse dentro de PricesProvider');
  }
  return ctx;
}
