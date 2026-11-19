// lib/authRedirect.ts
// Login con Google y regreso a la app desde enlaces de Supabase (Google / correo).
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Dirección a la que Supabase regresa después de Google o del correo de confirmación.
 * - En Expo Go:      exp://192.168.x.x:8081/--/auth-callback
 * - En la app final: agendaeventialashes://auth-callback
 * Ambas deben estar en Supabase > Authentication > URL Configuration > Redirect URLs.
 */
export function getAuthRedirectUrl() {
  return Linking.createURL('auth-callback');
}

/** Toma una URL de regreso (con ?code= o ?error=) y crea la sesión. */
export async function completeSessionFromUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  const errDesc =
    typeof queryParams?.error_description === 'string' ? queryParams.error_description : null;

  if (errDesc) return { ok: false, error: errDesc };
  if (!code) {
    const { data } = await supabase.auth.getSession();
    return data.session ? { ok: true } : { ok: false, error: 'No llegó el código de acceso.' };
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Puede pasar que el código ya se haya usado (la pantalla de callback y el login
    // lo procesan casi al mismo tiempo). Si ya hay sesión, todo bien.
    const { data } = await supabase.auth.getSession();
    if (data.session) return { ok: true };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Abre Google en el navegador y regresa con la sesión iniciada. */
export async function signInWithGoogle(): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  const redirectTo = getAuthRedirectUrl();
  // Esta dirección debe estar en Supabase > Authentication > URL Configuration > Redirect URLs
  console.log('[Google] redirectTo =', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' }, // deja elegir cuenta de Google
    },
  });
  if (error || !data?.url) return { ok: false, error: error?.message ?? 'No se pudo abrir Google.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'success' && result.url) {
    return completeSessionFromUrl(result.url);
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    // En algunos Android el navegador se cierra antes de avisar; revisar si ya hay sesión
    const { data: s } = await supabase.auth.getSession();
    return s.session ? { ok: true } : { ok: false, cancelled: true };
  }
  return { ok: false, error: 'No se completó el inicio con Google.' };
}
