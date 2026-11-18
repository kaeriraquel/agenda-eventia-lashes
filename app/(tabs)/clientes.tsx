import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useClients } from '../../context/ClientsContext';
import { Colors } from '../../constants/theme';

export default function ClientesScreen() {
  const router = useRouter();
  const { clients, loading } = useClients();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(c => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return name.includes(s) || phone.includes(s);
    });
  }, [clients, q]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clientes</Text>
      <Text style={styles.subtitle}>Historial, teléfono y notas.</Text>

      <TextInput
        style={styles.search}
        value={q}
        onChangeText={setQ}
        placeholder="Buscar por nombre o teléfono…"
      />

      {loading ? (
        <Text style={styles.muted}>Cargando…</Text>
      ) : filtered.length === 0 ? (
        <Text style={styles.muted}>Aún no hay clientes.</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/client/[id]', params: { id: item.id } })}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.phone ? `📞 ${item.phone}` : '📞 —'}</Text>
              {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
            </TouchableOpacity>
          )}
        />
      )}

      <View style={styles.addButtonWrapper}>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/client/new')}>
          <Text style={styles.addButtonText}>+ Nuevo cliente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBackground, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: 12 },
  search: {
    borderWidth: 1, borderColor: Colors.borderSoft, backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  muted: { color: Colors.textMuted, marginTop: 14, fontStyle: 'italic' },
  card: {
    backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderSoft,
  },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text },
  meta: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
  notes: { marginTop: 6, fontSize: 12, color: Colors.textSubtle },
  addButtonWrapper: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  addButton: { backgroundColor: Colors.primary, borderRadius: 999, alignItems: 'center', paddingVertical: 14 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
