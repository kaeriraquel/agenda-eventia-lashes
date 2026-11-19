// app/auth-callback.tsx
// Pantalla a la que regresan los enlaces de Supabase (Google y confirmación de correo).
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { completeSessionFromUrl } from '../lib/authRedirect';
import { Colors } from '../constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    completeSessionFromUrl(url).then(res => {
      if (!alive) return;
      if (res.ok) router.replace('/(tabs)');
      else setError(res.error ?? 'No se pudo iniciar sesión.');
    });
    return () => {
      alive = false;
    };
  }, [url, router]);

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.title}>No se pudo entrar</Text>
          <Text style={styles.text}>
            {error}
            {'\n\n'}Si venías del correo de confirmación, tu cuenta ya quedó confirmada: inicia sesión
            con tu correo y contraseña.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth')}>
            <Text style={styles.buttonText}>Ir a iniciar sesión</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={[styles.text, { marginTop: 12 }]}>Entrando a tu cuenta…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.screenBackground,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  text: { color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  button: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
