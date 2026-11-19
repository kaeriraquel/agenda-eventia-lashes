// app/(tabs)/clientas.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppointments } from '../../context/AppointmentsContext';
import { Colors, Radii, Shadow, Typography } from '../../constants/theme';
import { Avatar, Chip, EmptyState, Fab, ScreenHeader, money } from '../../components/ui';
import { formatShortDate } from '../../lib/dates';

type SortKey = 'recientes' | 'visitas' | 'gasto';


interface ClientSummary {
  id: string;
  name: string;
  phone?: string;
  totalAppointments: number;
  totalRealized: number;
  totalRevenue: number;
  lastDate?: string;
}

export default function ClientasScreen() {
  const { appointments } = useAppointments();
  const router = useRouter();

  const clients: ClientSummary[] = useMemo(() => {
    const map = new Map<string, ClientSummary>();

    for (const a of appointments) {
      const name = a.clientName?.trim() || 'Sin nombre';
      const phone = a.phone?.trim();
      // Clave de clienta: nombre + teléfono (si hay)
      const key = phone ? `${name}::${phone}` : name;

      let existing = map.get(key);
      if (!existing) {
        existing = {
          id: key,
          name,
          phone,
          totalAppointments: 0,
          totalRealized: 0,
          totalRevenue: 0,
          lastDate: undefined,
        };
      }

      existing.totalAppointments += 1;

      if (a.status === 'realizada') {
        existing.totalRealized += 1;
        if (a.price != null) {
          existing.totalRevenue += a.price;
        }
      }

      // Actualizar última fecha
      if (a.date) {
        if (!existing.lastDate) {
          existing.lastDate = a.date;
        } else {
          // Comparamos como strings YYYY-MM-DD (funciona bien)
          if (a.date > existing.lastDate) {
            existing.lastDate = a.date;
          }
        }
      }

      map.set(key, existing);
    }

    const list = Array.from(map.values());

    // Ordenar por última visita (más reciente primero)
    list.sort((a, b) => {
      if (!a.lastDate && !b.lastDate) return 0;
      if (!a.lastDate) return 1;
      if (!b.lastDate) return -1;
      return b.lastDate.localeCompare(a.lastDate);
    });

    return list;
  }, [appointments]);

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('recientes');

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, '');
    let list = clients.filter(c => {
      if (!t) return true;
      if (c.name.toLowerCase().includes(t)) return true;
      return !!digits && (c.phone ?? '').replace(/\D/g, '').includes(digits);
    });
    if (sort === 'visitas') list = [...list].sort((a, b) => b.totalAppointments - a.totalAppointments);
    if (sort === 'gasto') list = [...list].sort((a, b) => b.totalRevenue - a.totalRevenue);
    return list;
  }, [clients, q, sort]);

  const openClient = (item: ClientSummary) =>
    router.push({
      pathname: '/client/detail',
      params: { clientKey: item.id, name: item.name, phone: item.phone ?? '' },
    });

  const renderItem = ({ item }: { item: ClientSummary }) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => openClient(item)}>
      <Avatar name={item.name} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={Typography.caption} numberOfLines={1}>
          {item.totalAppointments} {item.totalAppointments === 1 ? 'cita' : 'citas'}
          {item.lastDate ? ` · última ${formatShortDate(item.lastDate)}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.spent}>{money(item.totalRevenue)}</Text>
        <Text style={Typography.caption}>gastado</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <ScreenHeader title="Clientas" subtitle={`${clients.length} en total`} />

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Colors.textSubtle} />
          <TextInput
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder="Buscar por nombre o teléfono"
            placeholderTextColor={Colors.textSubtle}
          />
          {q ? (
            <TouchableOpacity onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textSubtle} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.chips}>
          <Chip label="Recientes" active={sort === 'recientes'} onPress={() => setSort('recientes')} />
          <Chip label="Más visitas" active={sort === 'visitas'} onPress={() => setSort('visitas')} />
          <Chip label="Mayor gasto" active={sort === 'gasto'} onPress={() => setSort('gasto')} />
        </View>
      </View>

      {visible.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={clients.length === 0 ? 'Aún no tienes clientas' : 'Sin resultados'}
          text={
            clients.length === 0
              ? 'Cuando agendes citas, aquí verás a tus clientas con su historial.'
              : 'Prueba con otro nombre o número.'
          }
          action={clients.length === 0 ? 'Agendar primera cita' : undefined}
          onAction={() => router.push('/appointment/new')}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Fab onPress={() => router.push('/appointment/new')} icon="add" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBackground },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 8 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  list: {
    marginHorizontal: 20,
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    padding: 12,
    marginBottom: 10,
    ...Shadow.card,
  },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  spent: { fontSize: 15, fontWeight: '700', color: Colors.text },
});
