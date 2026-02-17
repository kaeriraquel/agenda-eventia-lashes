// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { AppointmentsProvider } from '../context/AppointmentsContext';
import { AuthProvider } from '../context/AuthContext';
import { PricesProvider } from '../context/PricesContext';
import { BrandProvider } from '../context/BrandContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <BrandProvider>
        <AppointmentsProvider>
          <PricesProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </PricesProvider>
        </AppointmentsProvider>
      </BrandProvider>
    </AuthProvider>
  );
}
