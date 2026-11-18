// app/(tabs)/agenda.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppointments } from '../../context/AppointmentsContext';
import { Colors } from '../../constants/theme';
import { toLocalDateKey, parseDateKey } from '../../lib/dates';

export default function AgendaScreen() {
  const { appointments } = useAppointments();
  const router = useRouter();

  //agenda tipo calendario
  type RangeFilter = 'hoy' | 'manana' | '7dias' | 'mes' | 'todas';

  const [range, setRange] = useState<RangeFilter>('7dias');

  const toDateKey = toLocalDateKey;

  const isInRange = (dateStr: string, range: RangeFilter) => {
    if (!dateStr) return false;
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const d = parseDateKey(dateStr);
    if (isNaN(d.getTime())) return false;

    const dayKey = toDateKey(d);
    const todayKey = toDateKey(start);

    const tomorrow = new Date(start);
    tomorrow.setDate(start.getDate() + 1);
    const tomorrowKey = toDateKey(tomorrow);

    if (range === 'todas') return true;
    if (range === 'hoy') return dayKey === todayKey;
    if (range === 'manana') return dayKey === tomorrowKey;

    if (range === '7dias') {
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return d >= start && d < end;
    }

    if (range === 'mes') {
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      return d >= start && d < end;
    }

    return true;
  };


  // Helper para mostrar fecha bonita
  const formatDateForLabel = (dateStr: string): string => {
    const today = new Date();
    const d = parseDateKey(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const todayStr = toLocalDateKey(today);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = toLocalDateKey(tomorrow);

    const onlyDateStr = toLocalDateKey(d);

    if (onlyDateStr === todayStr) return 'Hoy';
    if (onlyDateStr === tomorrowStr) return 'Mañana';

    // Formato DD/MM/YYYY
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Ordenamos y agrupamos por fecha (YYYY-MM-DD)
  const sections = useMemo(() => {
    // Copia ordenada por fecha+hora
    const filtered = appointments.filter(a => isInRange(a.date, range));

    const sorted = [...filtered].sort((a, b) => {
      const keyA = `${a.date || ''} ${a.time || ''}`;
      const keyB = `${b.date || ''} ${b.time || ''}`;

      // En "Todas": más nueva → más antigua
      if (range === 'todas') {
        return keyB.localeCompare(keyA);
      }

      // En los demás rangos: normal (antigua → nueva)
      return keyA.localeCompare(keyB);
    });



    const map = new Map<string, typeof appointments>();

    for (const a of sorted) {
      const dateKey = a.date || 'Sin fecha';
      const list = map.get(dateKey) ?? [];
      list.push(a);
      map.set(dateKey, list);
    }

    return Array.from(map.entries()).map(([dateKey, aps]) => ({
      title: formatDateForLabel(dateKey),
      dateKey,
      data: aps,
    }));
  }, [appointments, range]);

  const renderStatusChip = (status: string) => {
    let bg = Colors.primarySoft;
    let textColor = Colors.primary;
    let label = status;

    if (status === 'pendiente') {
      bg = '#FFF5D9';
      textColor = Colors.warning;
      label = 'Pendiente';
    } else if (status === 'realizada') {
      bg = '#E7F9E7';
      textColor = Colors.success;
      label = 'Realizada';
    } else if (status === 'cancelada') {
      bg = '#FFE5E5';
      textColor = Colors.danger;
      label = 'Cancelada';
    } else if (status === 'no_asistio') {
      bg = '#F2E9FF';
      textColor = Colors.info;
      label = 'No asistió';
    }

    return (
      <View style={[styles.statusChip, { backgroundColor: bg }]}>
        <Text style={[styles.statusChipText, { color: textColor }]}>
          {label}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/appointment/[id]',
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>
              {item.clientName || 'Sin nombre'}
            </Text>
            <Text style={styles.serviceText}>
              {item.service || 'Sin servicio seleccionado'}
            </Text>
          </View>
          {renderStatusChip(item.status)}
        </View>

        <View style={styles.cardInfoRow}>
          <Text style={styles.infoText}>
            🕒 {item.time || 'Sin hora'}
          </Text>
          {item.price != null && (
            <Text style={styles.priceText}>
              ${item.price.toFixed(2)} MXN
            </Text>
          )}
        </View>

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            Notas: {item.notes}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agenda</Text>
      <Text style={styles.subtitle}>
        Revisa y organiza tus citas por día.
      </Text>

      <View style={styles.filterRow}>
        {[
          ['Hoy', 'hoy'],
          ['Mañana', 'manana'],
          ['7 días', '7dias'],
          ['Mes', 'mes'],
          ['Todas', 'todas'],
        ].map(([label, key]) => {
          const active = range === key;
          return (
            <TouchableOpacity
              key={key as string}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setRange(key as any)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>


      {sections.length === 0 ? (
        <Text style={styles.emptyText}>
          No hay citas en este rango. Prueba "Todas" o agrega una nueva.
        </Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* Botón para agregar cita */}
      <View style={styles.addButtonWrapper}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/appointment/new')}
        >
          <Text style={styles.addButtonText}>+ Agregar cita</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 16,
    fontStyle: 'italic',
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  serviceText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  notesText: {
    fontSize: 12,
    color: Colors.textSubtle,
    marginTop: 4,
  },
  addButtonWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.cardBackground,
  },
  filterChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.primary,
  },

});
