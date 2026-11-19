// app/(tabs)/mas.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, ListRow, Pill } from '../../components/ui';
import { Colors, Typography } from '../../constants/theme';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function MasScreen() {
  const router = useRouter();
  const { brandName, logoUri } = useBrand();
  const { user } = useAuth();

  const confirmSignOut = () =>
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);

  return (
    <Screen>
      <ScreenHeader title="Más" />

      {/* Perfil del estudio */}
      <Card style={styles.profile} onPress={() => router.push('/configuracion')}>
        <Image
          source={logoUri ? { uri: logoUri } : require('../../assets/images/logo-eventia-agenda.png')}
          style={styles.logo}
        />
        <View style={{ flex: 1 }}>
          <Text style={Typography.heading} numberOfLines={1}>
            {brandName}
          </Text>
          <Text style={Typography.caption} numberOfLines={1}>
            {user?.email ?? ''}
          </Text>
          <View style={{ marginTop: 6 }}>
            <Pill label="Plan Gratis" />
          </View>
        </View>
      </Card>

      <Text style={[Typography.overline, styles.groupTitle]}>Mi negocio</Text>
      <Card style={styles.group}>
        <ListRow
          icon="pricetags-outline"
          title="Servicios y precios"
          subtitle="Tu lista de servicios y productos"
          onPress={() => router.push('/precios')}
        />
        <ListRow
          icon="stats-chart-outline"
          title="Resumen y estadísticas"
          subtitle="Ingresos, servicios más vendidos"
          onPress={() => router.push('/estadisticas')}
        />
        <ListRow
          icon="logo-whatsapp"
          title="Mensajes de WhatsApp"
          subtitle="Recordatorios y avisos de retoque"
          onPress={() => router.push('/recordatorios')}
          last
        />
      </Card>

      <Text style={[Typography.overline, styles.groupTitle]}>Cuenta</Text>
      <Card style={styles.group}>
        <ListRow
          icon="color-palette-outline"
          title="Mi marca"
          subtitle="Nombre, logo y tipo de servicios"
          onPress={() => router.push('/configuracion')}
        />
        <ListRow
          icon="diamond-outline"
          title="Plan Pro"
          subtitle="Sin anuncios y funciones extra · Próximamente"
        />
        <ListRow icon="log-out-outline" title="Cerrar sesión" onPress={confirmSignOut} last />
      </Card>

      <Text style={styles.footer}>Agenda Eventia · hecho con cariño por Eventia SLW</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 60, height: 60, borderRadius: 16, backgroundColor: Colors.primarySoft },
  groupTitle: { marginTop: 24, marginBottom: 8, marginLeft: 4 },
  group: { paddingVertical: 0 },
  footer: { textAlign: 'center', color: Colors.textSubtle, fontSize: 12, marginTop: 28 },
});
