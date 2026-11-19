import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Guarda la sesión en el teléfono para no pedir login cada vez que se abre la app
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE: los enlaces de Google y del correo regresan a la app con un ?code=
    flowType: 'pkce',
  },
});

// Refrescar el token solo mientras la app está en primer plano
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
