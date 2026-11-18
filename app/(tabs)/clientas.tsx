// app/(tabs)/clientas.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppointments } from '../../context/AppointmentsContext';
import { Colors } from '../../constants/theme';


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

  const renderItem = ({ item }: { item: ClientSummary }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/client/detail',
            params: {
              clientKey: item.id,          // tu key actual "name::phone" o "name"
              name: item.name,
              phone: item.phone ?? '',
            },
          })
        }

      >
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            {item.phone ? (
              <Text style={styles.phone}>{item.phone}</Text>
            ) : (
              <Text style={styles.phoneEmpty}>Sin teléfono</Text>
            )}
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {item.totalAppointments} cita
              {item.totalAppointments === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View style={styles.cardRowBottom}>
          <Text style={styles.labelSmall}>
            Realizadas:{' '}
            <Text style={styles.valueSmall}>{item.totalRealized}</Text>
          </Text>
          <Text style={styles.labelSmall}>
            Total gastado:{' '}
            <Text style={styles.valueMoney}>
              ${item.totalRevenue.toFixed(2)}
            </Text>
          </Text>
        </View>

        {item.lastDate && (
          <Text style={styles.lastVisit}>
            Última visita: {item.lastDate}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clientas</Text>
      <Text style={styles.subtitle}>
        Lista generada a partir de tus citas registradas.
      </Text>

      {clients.length === 0 ? (
        <Text style={styles.empty}>
          Aún no tienes citas registradas. Cuando agendes, aquí verás a tus
          clientas.
        </Text>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
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
  empty: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 16,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  phone: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  phoneEmpty: {
    fontSize: 12,
    color: Colors.textSubtle,
    marginTop: 2,
    fontStyle: 'italic',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primarySoft,
  },
  chipText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  valueSmall: {
    fontWeight: '600',
    color: Colors.text,
  },
  valueMoney: {
    fontWeight: '700',
    color: Colors.primary,
  },
  lastVisit: {
    fontSize: 11,
    color: Colors.textSubtle,
    marginTop: 4,
  },
});
