// app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';

import { BrandProvider } from '../context/BrandContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ClientsProvider } from '../context/ClientsContext';
import { AppointmentsProvider } from '../context/AppointmentsContext';
import { PricesProvider } from '../context/PricesContext';
import { Colors } from '../constants/theme';

// Pantallas que se pueden ver sin sesión
const PUBLIC_ROUTES = ['auth', 'auth-callback'];

/** Manda a /auth si no hay sesión, y a la app si ya la hay. */
function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0] ?? '';
    const isPublic = PUBLIC_ROUTES.includes(first);

    if (!user && !isPublic) {
      router.replace('/auth');
    } else if (user && first === 'auth') {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: Colors.screenBackground },
          headerTintColor: Colors.primary,
          headerShadowVisible: false,
          headerBackTitle: 'Atrás',
          headerTitle: '', // cada pantalla ya muestra su propio título grande
        }}
      >
        {/* Pantallas "de detalle": encabezado con flecha ← para regresar */}
        <Stack.Screen name="appointment/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="appointment/new" options={{ headerShown: true }} />
        <Stack.Screen name="client/detail" options={{ headerShown: true }} />
        <Stack.Screen name="client/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="client/new" options={{ headerShown: true }} />
        <Stack.Screen name="precios" options={{ headerShown: true, headerTitle: '' }} />
        <Stack.Screen name="estadisticas" options={{ headerShown: true, headerTitle: '' }} />
        <Stack.Screen name="configuracion" options={{ headerShown: true, headerTitle: '' }} />
        <Stack.Screen name="recordatorios" options={{ headerShown: true, headerTitle: 'Mensajes de WhatsApp' }} />
      </Stack>
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <BrandProvider>
      <AuthProvider>
        <ClientsProvider>
          <AppointmentsProvider>
            <PricesProvider>
              <AuthGate />
            </PricesProvider>
          </AppointmentsProvider>
        </ClientsProvider>
      </AuthProvider>
    </BrandProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.screenBackground,
  },
});
