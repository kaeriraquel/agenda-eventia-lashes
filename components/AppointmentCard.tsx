// components/AppointmentCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import type { Appointment } from '../context/AppointmentsContext';

interface Props {
  appointment: Appointment;
  onPress?: () => void;
}

export function AppointmentCard({ appointment, onPress }: Props) {
  const { clientName, service, date, time, status, phone } = appointment;

  const handleCall = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    // Deja que tú guardes el número como quieras (con lada o completo)
    const clean = phone.replace(/\D/g, '');
    const url = `https://wa.me/${clean}`;
    Linking.openURL(url);
  };

  const statusColor =
    status === 'realizada'
      ? '#6FD66F'
      : status === 'pendiente'
      ? '#FFB347'
      : status === 'cancelada'
      ? '#FF6B6B'
      : '#A785FF';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.clientName}>{clientName}</Text>
          {phone ? (
            <Text style={styles.phoneText}>{phone}</Text>
          ) : (
            <Text style={styles.phoneTextEmpty}>Sin teléfono</Text>
          )}
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <Text style={styles.serviceText}>{service}</Text>
      <Text style={styles.dateText}>
        {date} · {time}
      </Text>

      {phone && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Text style={styles.actionButtonText}>Llamar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneText: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  phoneTextEmpty: {
    fontSize: 13,
    color: '#B3B3B3',
    marginTop: 2,
    fontStyle: 'italic',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginLeft: 8,
  },
  serviceText: {
    fontSize: 14,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFB3CF',
    paddingVertical: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#FF6FB5',
    fontWeight: '500',
  },
});
