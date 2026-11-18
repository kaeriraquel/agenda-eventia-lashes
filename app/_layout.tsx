// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

import { BrandProvider } from '../context/BrandContext';
import { AuthProvider } from '../context/AuthContext';
import { ClientsProvider } from '../context/ClientsContext';
import { AppointmentsProvider } from '../context/AppointmentsContext';
import { PricesProvider } from '../context/PricesContext';

export default function RootLayout() {
  return (
    <BrandProvider>
      <AuthProvider>
        <ClientsProvider>
          <AppointmentsProvider>
            <PricesProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </PricesProvider>
          </AppointmentsProvider>
        </ClientsProvider>
      </AuthProvider>
    </BrandProvider>
  );
}
