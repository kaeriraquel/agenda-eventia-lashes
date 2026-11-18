// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSubtle,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 6,
          height: 64,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'agenda') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'precios') {
            iconName = focused ? 'pricetag' : 'pricetag-outline';
          } else if (route.name === 'estadisticas') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'clientas') {
            iconName = focused ? 'people' : 'people-outline';
          }else if (route.name === 'configuracion') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio' }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Citas' }}
      />
      <Tabs.Screen
        name="precios"
        options={{ title: 'Precios' }}
      />
      <Tabs.Screen
        name="estadisticas"
        options={{ title: 'Resumen' }}
      />
      <Tabs.Screen
        name="clientas"
        options={{ title: 'Clientas' }}
      />
      {/* Pantalla de clientas en la nube: aún sin terminar, se oculta de la barra */}
      <Tabs.Screen
        name="clientes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="configuracion"
        options={{ title: 'Mi marca' }}
      />
    </Tabs>
  );
}
