import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppointments } from '../../context/AppointmentsContext';
import { Colors } from '../../constants/theme';
import { normalizePhone } from '../../lib/phone';

export default function ClientDetailScreen() {
  const router = useRouter();
  const { appointments } = useAppointments();
  const params = useLocalSearchParams();

  const name = String(params.name ?? '').trim();
  const phone = String(params.phone ?? '').trim();
  const clientKey = String(params.clientKey ?? '').trim();
  const phoneNorm = normalizePhone(phone);

  const clientAppointments = useMemo(() => {
    // Preferimos clientId si ya lo tienes guardado en citas Pro
    // (si aún no lo tienes en tus citas viejas, cae al fallback)
    const byClientId = appointments.filter(a => {
      // si en algún punto mandas clientId en params, aquí lo puedes usar también
      return false;
    });

    if (byClientId.length > 0) return byClientId;

    // Fallback: misma lógica que tu lista: name + phone (si hay)
    return appointments
      .filter(a => {
        const aName = (a.clientName ?? '').trim();
        const aPhoneNorm = normalizePhone(a.phone ?? '');
        if (!name) return false;

        if (phoneNorm) {
          return aName.toLowerCase() === name.toLowerCase() && aPhoneNorm === phoneNorm;
        }

        // sin teléfono: solo por nombre (menos exacto)
        return aName.toLowerCase() === name.toLowerCase();
      })
      .sort((a, b) => {
        const keyA = `${a.date || ''} ${a.time || ''}`;
        const keyB = `${b.date || ''} ${b.time || ''}`;
        return keyB.localeCompare(keyA); // más nuevas primero
      });
  }, [appointments, name, phoneNorm]);

  const total = useMemo(() => {
    let revenue = 0;
    let realized = 0;
    for (const a of clientAppointments) {
      if (a.status === 'realizada') {
        realized++;
        if (a.price != null) revenue += a.price;
      }
    }
    return { revenue, realized, total: clientAppointments.length };
  }, [clientAppointments]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name || 'Clienta'}</Text>
      <Text style={styles.subtitle}>{phone ? `📞 ${phone}` : '📞 Sin teléfono'}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Citas</Text>
          <Text style={styles.statValue}>{total.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Realizadas</Text>
          <Text style={styles.statValue}>{total.realized}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Gastado</Text>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            ${total.revenue.toFixed(2)}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Historial</Text>

      {clientAppointments.length === 0 ? (
        <Text style={styles.empty}>Aún no hay citas para esta clienta.</Text>
      ) : (
        <FlatList
          data={clientAppointments}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/appointment/[id]', params: { id: item.id } })
              }
            >
              <Text style={styles.cardTitle}>{item.service || 'Sin servicio'}</Text>
              <Text style={styles.cardMeta}>
                📅 {item.date || '—'}  🕒 {item.time || '—'}
              </Text>
              {item.price != null ? (
                <Text style={styles.cardPrice}>${item.price.toFixed(2)} MXN</Text>
              ) : null}
              <Text style={styles.cardStatus}>Estatus: {item.status}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={styles.addButtonWrapper}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push({
              pathname: '/appointment/new',
              params: {
                prefillName: name,
                prefillPhone: phone,
                prefillClientKey: clientKey,
              },
            })
          }
        >
          <Text style={styles.addButtonText}>+ Nueva cita para esta clienta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBackground, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { marginTop: 4, fontSize: 13, color: Colors.textMuted },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statValue: { marginTop: 6, fontSize: 16, fontWeight: '700', color: Colors.text },

  sectionTitle: { marginTop: 4, marginBottom: 8, fontSize: 14, fontWeight: '700', color: Colors.text },
  empty: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', marginTop: 12 },

  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardMeta: { marginTop: 4, fontSize: 12, color: Colors.textMuted },
  cardPrice: { marginTop: 6, fontSize: 13, fontWeight: '800', color: Colors.primary },
  cardStatus: { marginTop: 6, fontSize: 12, color: Colors.textSubtle },

  addButtonWrapper: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
