// components/AppointmentRow.tsx
// Fila de cita estilo línea de tiempo: hora a la izquierda, tarjeta a la derecha.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Appointment } from '../context/AppointmentsContext';
import { Colors, Radii, Shadow } from '../constants/theme';
import { StatusBadge, money } from './ui';
import { formatTime12 } from '../lib/dates';

export function AppointmentRow({
  appointment: a,
  onPress,
  showDate,
  right,
}: {
  appointment: Appointment;
  onPress?: () => void;
  showDate?: string; // texto opcional arriba de la hora (ej. "Mañana")
  right?: React.ReactNode;
}) {
  // "4:30 p. m." -> "4:30" + "p. m."
  const t12 = formatTime12(a.time);
  const sp = t12.indexOf(' ');
  const hm = sp > 0 ? t12.slice(0, sp) : t12;
  const suffix = sp > 0 ? t12.slice(sp + 1) : '';
  const isNails = a.module === 'nails';
  const faded = a.status === 'cancelada' || a.status === 'no_asistio';

  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        {showDate ? <Text style={styles.dateTop}>{showDate}</Text> : null}
        <Text style={styles.time}>{hm}</Text>
        <Text style={styles.suffix}>{suffix}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.card, faded && { opacity: 0.6 }]}
      >
        <View style={[styles.bar, { backgroundColor: isNails ? Colors.accentNude : Colors.primaryLight }]} />
        <View style={{ flex: 1, paddingVertical: 12, paddingRight: 12 }}>
          <View style={styles.topLine}>
            <Text style={styles.name} numberOfLines={1}>
              {a.clientName}
            </Text>
            {right}
          </View>
          <Text style={styles.service} numberOfLines={1}>
            {a.service}
          </Text>
          <View style={styles.bottomLine}>
            <StatusBadge status={a.status} />
            {a.price != null ? (
              <View style={styles.priceWrap}>
                {a.paid ? (
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                ) : null}
                <Text style={styles.price}>{money(a.price)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  timeCol: { width: 54, alignItems: 'flex-end', paddingTop: 12 },
  dateTop: { fontSize: 10, color: Colors.primary, fontWeight: '700', marginBottom: 2 },
  time: { fontSize: 15, fontWeight: '700', color: Colors.text },
  suffix: { fontSize: 11, color: Colors.textSubtle },
  card: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    overflow: 'hidden',
    ...Shadow.card,
  },
  bar: { width: 4 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  service: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontSize: 14, fontWeight: '700', color: Colors.text },
});
