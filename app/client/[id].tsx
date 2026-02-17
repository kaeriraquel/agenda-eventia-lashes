import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppointments } from '../../context/AppointmentsContext';
import { Colors } from '../../constants/theme';


export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { appointments } = useAppointments();

  const clientId = Array.isArray(id) ? id[0] : id;

  const {
    name,
    phone,
    totalAppointments,
    totalRealized,
    totalPending,
    totalCancelled,
    totalNoShow,
    totalRevenue,
    lastDate,
    services,
    clientAppointments,
  } = useMemo(() => {
    if (!clientId) {
      return {
        name: 'Clienta',
        phone: undefined,
        totalAppointments: 0,
        totalRealized: 0,
        totalPending: 0,
        totalCancelled: 0,
        totalNoShow: 0,
        totalRevenue: 0,
        lastDate: undefined,
        services: [] as { service: string; count: number }[],
        clientAppointments: [] as typeof appointments,
      };
    }

    let name = 'Clienta';
    let phone: string | undefined = undefined;
    let totalAppointments = 0;
    let totalRealized = 0;
    let totalPending = 0;
    let totalCancelled = 0;
    let totalNoShow = 0;
    let totalRevenue = 0;
    let lastDate: string | undefined;

    const serviceMap = new Map<string, number>();
    const clientAppointments = [] as typeof appointments;

    for (const a of appointments) {
      const clientName = a.clientName?.trim() || 'Sin nombre';
      const clientPhone = a.phone?.trim();
      const key = clientPhone ? `${clientName}::${clientPhone}` : clientName;

      if (key !== clientId) continue;

      // Esta cita sí es de esta clienta
      clientAppointments.push(a);

      name = clientName;
      phone = clientPhone;

      totalAppointments += 1;

      if (a.status === 'realizada') {
        totalRealized += 1;
        if (a.price != null) {
          totalRevenue += a.price;
        }
      } else if (a.status === 'pendiente') {
        totalPending += 1;
      } else if (a.status === 'cancelada') {
        totalCancelled += 1;
      } else if (a.status === 'no_asistio') {
        totalNoShow += 1;
      }

      if (a.date) {
        if (!lastDate) {
          lastDate = a.date;
        } else if (a.date > lastDate) {
          lastDate = a.date;
        }
      }

      const s = a.service || 'Sin servicio';
      const count = serviceMap.get(s) ?? 0;
      serviceMap.set(s, count + 1);
    }

    const services = Array.from(serviceMap.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);

    return {
      name,
      phone,
      totalAppointments,
      totalRealized,
      totalPending,
      totalCancelled,
      totalNoShow,
      totalRevenue,
      lastDate,
      services,
      clientAppointments,
    };
  }, [clientId, appointments]);

  const handleCall = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header simple propio */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>◀ Volver</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{name}</Text>
      {phone ? (
        <Text style={styles.phone}>{phone}</Text>
      ) : (
        <Text style={styles.phoneEmpty}>Sin teléfono registrado</Text>
      )}

      {phone && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Text style={styles.actionText}>Llamar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleWhatsApp}
          >
            <Text style={styles.actionText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RESUMEN */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.rowSpace}>
          <View>
            <Text style={styles.label}>Citas totales</Text>
            <Text style={styles.value}>{totalAppointments}</Text>
          </View>
          <View>
            <Text style={styles.label}>Citas realizadas</Text>
            <Text style={styles.value}>{totalRealized}</Text>
          </View>
        </View>

        <View style={[styles.rowSpace, { marginTop: 8 }]}>
          <View>
            <Text style={styles.label}>Total gastado</Text>
            <Text style={styles.valueMoney}>
              ${totalRevenue.toFixed(2)} MXN
            </Text>
          </View>
          <View>
            <Text style={styles.label}>Última visita</Text>
            <Text style={styles.valueSmall}>
              {lastDate ?? '—'}
            </Text>
          </View>
        </View>

        <View style={[styles.rowSpace, { marginTop: 8 }]}>
          <View>
            <Text style={styles.labelSmall}>Pendientes</Text>
            <Text style={styles.valueSmall}>{totalPending}</Text>
          </View>
          <View>
            <Text style={styles.labelSmall}>Canceladas</Text>
            <Text style={styles.valueSmall}>{totalCancelled}</Text>
          </View>
          <View>
            <Text style={styles.labelSmall}>No asistió</Text>
            <Text style={styles.valueSmall}>{totalNoShow}</Text>
          </View>
        </View>
      </View>

      {/* SERVICIOS QUE SE HA HECHO */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Servicios realizados</Text>
        {services.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no hay servicios registrados para esta clienta.
          </Text>
        ) : (
          services.map(s => (
            <View key={s.service} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{s.service}</Text>
              <Text style={styles.serviceCount}>
                {s.count} vez{s.count === 1 ? '' : 'es'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* HISTORIAL DE CITAS */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Historial de citas</Text>
        {clientAppointments.length === 0 ? (
          <Text style={styles.emptyText}>
            No hay citas para esta clienta.
          </Text>
        ) : (
          clientAppointments.map(a => (
            <View key={a.id} style={styles.appointmentItem}>
              <Text style={styles.appointmentMain}>
                {a.date} · {a.time} · {a.service || 'Sin servicio'}
              </Text>
              <Text style={styles.appointmentSub}>
                Estado: {a.status}
                {a.price != null
                  ? ` · $${a.price.toFixed(2)}`
                  : ''}
              </Text>
              {a.notes ? (
                <Text style={styles.appointmentNotes}>
                  Notas: {a.notes}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: Colors.screenBackground,
    flexGrow: 1,
  },
  headerRow: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  phoneEmpty: {
    fontSize: 13,
    color: Colors.textSubtle,
    marginTop: 2,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  actionButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
  },
  actionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: Colors.text,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  labelSmall: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  valueMoney: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  valueSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textSubtle,
    fontStyle: 'italic',
    marginTop: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  serviceName: {
    fontSize: 13,
    color: Colors.text,
  },
  serviceCount: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  appointmentItem: {
    marginTop: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  appointmentMain: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  appointmentSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  appointmentNotes: {
    fontSize: 12,
    color: Colors.textSubtle,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
