// app/(tabs)/_layout.tsx
import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home', 'home-outline'],
  agenda: ['calendar', 'calendar-outline'],
  clientas: ['people', 'people-outline'],
  caja: ['wallet', 'wallet-outline'],
  mas: ['grid', 'grid-outline'],
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSubtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 66,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarIcon: ({ color, focused }) => {
          const pair = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? pair[0] : pair[1]} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="clientas" options={{ title: 'Clientas' }} />
      <Tabs.Screen name="caja" options={{ title: 'Caja' }} />
      <Tabs.Screen name="mas" options={{ title: 'Más' }} />
      {/* Versión en la nube de clientas: sin terminar, oculta */}
      <Tabs.Screen name="clientes" options={{ href: null }} />
    </Tabs>
  );
}
