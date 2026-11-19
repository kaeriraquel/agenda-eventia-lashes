import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppointments } from '../context/AppointmentsContext';
import { Colors } from '../constants/theme';


export default function EstadisticasScreen() {

const [startDate, setStartDate] = useState<string | null>(null);
const [endDate, setEndDate] = useState<string | null>(null);

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isWeb = Platform.OS === 'web';

const [activePreset, setActivePreset] = useState<string>('all');

const setPresetRange = (preset: string) => {
  const today = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  if (preset === 'all') {
    start = null;
    end = null;
  } else if (preset === 'last7') {
    end = today;
    start = new Date(today);
    start.setDate(today.getDate() - 6); // últimos 7 días, incluyendo hoy
  } else if (preset === 'thisMonth') {
    const year = today.getFullYear();
    const month = today.getMonth();
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0); // último día del mes
  } else if (preset === 'lastMonth') {
    const year = today.getFullYear();
    const month = today.getMonth();
    // mes anterior
    const prevMonth = month - 1;
    const prevYear = prevMonth < 0 ? year - 1 : year;
    const realPrevMonth = prevMonth < 0 ? 11 : prevMonth;
    start = new Date(prevYear, realPrevMonth, 1);
    end = new Date(prevYear, realPrevMonth + 1, 0);
  }

  if (start && end) {
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  } else {
    setStartDate(null);
    setEndDate(null);
  }

  setActivePreset(preset);
};


const [showStartPicker, setShowStartPicker] = useState(false);
const [showEndPicker, setShowEndPicker] = useState(false);

  // Helpers
  const parseDate = (dateStr: string): Date | null => {
    // Esperamos formato YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(p => Number(p));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };
  const { appointments } = useAppointments();
  const now = new Date();

  const isInRange = (dateStr: string): boolean => {
  const d = parseDate(dateStr);
  if (!d) return false;

  // Si no hay filtros, siempre está dentro del rango
  if (!startDate && !endDate) return true;

  let afterStart = true;
  let beforeEnd = true;

  if (startDate) {
    const s = parseDate(startDate);
    if (!s) return false;
    afterStart = d >= s;
  }

  if (endDate) {
    const e = parseDate(endDate);
    if (!e) return false;
    // sumamos fin del día para incluirlo completo
    e.setHours(23, 59, 59, 999);
    beforeEnd = d <= e;
  }

  return afterStart && beforeEnd;
};

// 👉 Todas las citas dentro del rango (cualquier estatus)
const appointmentsInRange = useMemo(
  () => appointments.filter(a => isInRange(a.date)),
  [appointments, startDate, endDate]
);

// 👉 Solo realizadas con precio dentro del rango
const realizedAppointments = useMemo(
  () =>
    appointmentsInRange.filter(
      a => a.status === 'realizada' && a.price != null
    ),
  [appointmentsInRange]
);



  // 👉 Totales generales
const {
  totalRevenue,
  totalAppointments,
  totalRealized,
  totalPending,
  totalCancelled,
  totalNoShow,
} = useMemo(() => {
  let revenue = 0;
  let realized = 0;
  let pending = 0;
  let cancelled = 0;
  let noShow = 0;

  for (const a of appointmentsInRange) {
    if (a.status === 'realizada' && a.price != null) {
      revenue += a.price;
      realized++;
    } else if (a.status === 'pendiente') {
      pending++;
    } else if (a.status === 'cancelada') {
      cancelled++;
    } else if (a.status === 'no_asistio') {
      noShow++;
    }
  }

  return {
    totalRevenue: revenue,
    totalAppointments: appointmentsInRange.length,
    totalRealized: realized,
    totalPending: pending,
    totalCancelled: cancelled,
    totalNoShow: noShow,
  };
}, [appointmentsInRange]);


  // 👉 Ganancia del mes actual
    const { currentMonthRevenue, currentMonthCount } = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    let revenue = 0;
    let count = 0;

    for (const a of appointments) {
        if (a.status !== 'realizada' || a.price == null) continue;

        const d = parseDate(a.date);
        if (!d) continue;

        if (d.getFullYear() === year && d.getMonth() === month) {
        revenue += a.price ?? 0;
        count++;
        }
    }

    return { currentMonthRevenue: revenue, currentMonthCount: count };
    }, [appointments, now]);


  // 👉 Ingresos por semana (últimas 4 semanas)
  const weeklyData = useMemo(() => {
    // weeks[0] = esta semana, weeks[1] = semana pasada, etc.
    const weeks = [0, 0, 0, 0];

    for (const a of realizedAppointments) {
      const d = parseDate(a.date);
      if (!d) continue;

      const diffMs = now.getTime() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays >= 0 && diffDays < 7) {
        weeks[0] += a.price ?? 0;
      } else if (diffDays >= 7 && diffDays < 14) {
        weeks[1] += a.price ?? 0;
      } else if (diffDays >= 14 && diffDays < 21) {
        weeks[2] += a.price ?? 0;
      } else if (diffDays >= 21 && diffDays < 28) {
        weeks[3] += a.price ?? 0;
      }
    }

    const max = Math.max(...weeks, 0);
    return { weeks, max };
  }, [realizedAppointments, now]);

  // 👉 Servicios más vendidos
  const serviceStats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; revenue: number }
    >();

    for (const a of realizedAppointments) {
      const key = a.service || 'Sin servicio';
      const entry = map.get(key) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += a.price ?? 0;
      map.set(key, entry);
    }

    // Lo convertimos a array y ordenamos por revenue desc
    const arr = Array.from(map.entries()).map(([service, data]) => ({
      service,
      count: data.count,
      revenue: data.revenue,
    }));

    arr.sort((a, b) => b.revenue - a.revenue);

    // Devolvemos solo top 5
    return arr.slice(0, 5);
  }, [realizedAppointments]);

  const weekLabels = ['Esta semana', 'Hace 1 sem', 'Hace 2 sem', 'Hace 3 sem'];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard de tu estudio</Text>
      <Text style={styles.subtitle}>
        Revisa tus ingresos, citas y servicios más vendidos.
      </Text>
    
{/* FILTRO POR FECHAS */}
<View style={styles.sectionCard}>
  <Text style={styles.sectionTitle}>Filtrar por fechas</Text>
  <Text style={styles.sectionSubtitle}>
    Selecciona un rango para ver las estadísticas.
  </Text>


  {/* BOTONES PRESET */}
  <View style={styles.presetRow}>
    <TouchableOpacity
      style={[
        styles.presetButton,
        activePreset === 'all' && styles.presetButtonActive,
      ]}
      onPress={() => setPresetRange('all')}
    >
      <Text
        style={[
          styles.presetButtonText,
          activePreset === 'all' && styles.presetButtonTextActive,
        ]}
      >
        Todo
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.presetButton,
        activePreset === 'last7' && styles.presetButtonActive,
      ]}
      onPress={() => setPresetRange('last7')}
    >
      <Text
        style={[
          styles.presetButtonText,
          activePreset === 'last7' && styles.presetButtonTextActive,
        ]}
      >
        Últimos 7 días
      </Text>
    </TouchableOpacity>
  </View>

  <View style={styles.presetRow}>
    <TouchableOpacity
      style={[
        styles.presetButton,
        activePreset === 'thisMonth' && styles.presetButtonActive,
      ]}
      onPress={() => setPresetRange('thisMonth')}
    >
      <Text
        style={[
          styles.presetButtonText,
          activePreset === 'thisMonth' && styles.presetButtonTextActive,
        ]}
      >
        Este mes
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.presetButton,
        activePreset === 'lastMonth' && styles.presetButtonActive,
      ]}
      onPress={() => setPresetRange('lastMonth')}
    >
      <Text
        style={[
          styles.presetButtonText,
          activePreset === 'lastMonth' && styles.presetButtonTextActive,
        ]}
      >
        Mes pasado
      </Text>
    </TouchableOpacity>
  </View>

  {/* FECHA INICIAL */}
    <View style={{ marginTop: 10 }}>
        <Text style={styles.label}>Fecha inicial</Text>

        {isWeb ? (
        // En web seguimos con TextInput
        <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={startDate ?? ''}
            onChangeText={text => {
            setStartDate(text);
            setActivePreset('none');
            }}

        />
        ) : (
        <>
            <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowStartPicker(true)}
            >
            <Text style={styles.dateInputText}>
                {startDate ?? 'YYYY-MM-DD'}
            </Text>
            </TouchableOpacity>

            {showStartPicker && (
            <DateTimePicker
                value={parseDate(startDate ?? '') ?? new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                setShowStartPicker(false);
                if (event.type === 'dismissed') return;
                if (selectedDate) {
                    const formatted = formatDate(selectedDate);
                    setStartDate(formatted);
                }
                }}
            />
            )}
        </>
        )}
    </View>

    {/* FECHA FINAL */}
    <View style={{ marginTop: 10 }}>
        <Text style={styles.label}>Fecha final</Text>

        {isWeb ? (
        <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={endDate ?? ''}
            onChangeText={setEndDate}
        />
        ) : (
        <>
            <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowEndPicker(true)}
            >
            <Text style={styles.dateInputText}>
                {endDate ?? 'YYYY-MM-DD'}
            </Text>
            </TouchableOpacity>

            {showEndPicker && (
            <DateTimePicker
                value={parseDate(endDate ?? '') ?? new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                setShowEndPicker(false);
                if (event.type === 'dismissed') return;
                if (selectedDate) {
                    const formatted = formatDate(selectedDate);
                    setEndDate(formatted);
                }
                }}
            />
            )}
        </>
        )}
    </View>
    </View>



      {/* TARJETAS PRINCIPALES */}
      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Ganancia total</Text>
          <Text style={[styles.cardNumber, styles.moneyText]}>
            ${totalRevenue.toFixed(2)} MXN
          </Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>Citas totales</Text>
          <Text style={styles.cardNumber}>{totalAppointments}</Text>
        </View>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>Realizadas</Text>
          <Text style={styles.cardNumber}>{totalRealized}</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>Pendientes</Text>
          <Text style={styles.cardNumber}>{totalPending}</Text>
        </View>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>Canceladas</Text>
          <Text style={styles.cardNumber}>{totalCancelled}</Text>
        </View>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>No asistió</Text>
          <Text style={styles.cardNumber}>{totalNoShow}</Text>
        </View>
      </View>

      {/* MES ACTUAL */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Mes actual</Text>
        <Text style={styles.sectionSubtitle}>
          Ingresos y citas del mes en curso.
        </Text>
        <View style={styles.rowSpace}>
          <View>
            <Text style={styles.label}>Ganancia del mes</Text>
            <Text style={styles.valueMoney}>
              ${currentMonthRevenue.toFixed(2)} MXN
            </Text>
          </View>
          <View>
            <Text style={styles.label}>Citas realizadas</Text>
            <Text style={styles.value}>{currentMonthCount}</Text>
          </View>
        </View>
      </View>

      {/* GRÁFICA: INGRESOS ÚLTIMAS 4 SEMANAS */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ingresos últimas 4 semanas</Text>
        <Text style={styles.sectionSubtitle}>
          Solo se cuentan citas marcadas como realizadas.
        </Text>

        <View style={styles.chartContainer}>
          {weeklyData.max === 0 ? (
            <Text style={styles.chartEmptyText}>
              Aún no hay datos suficientes para mostrar la gráfica.
            </Text>
          ) : (
            <View style={styles.chartInner}>
              {weeklyData.weeks.map((value, index) => {
                const max = weeklyData.max || 1;
                const ratio = value / max;
                const barHeight = 20 + ratio * 120; // altura mínima 20, máx ~140

                return (
                  <View key={index} style={styles.chartBarWrapper}>
                    <View style={[styles.chartBar, { height: barHeight }]}>
                      <Text style={styles.chartBarValue}>
                        {value.toFixed(0)}
                      </Text>
                    </View>
                    <Text style={styles.chartBarLabel}>
                      {weekLabels[index]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* SERVICIOS MÁS VENDIDOS */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Servicios más vendidos</Text>
        <Text style={styles.sectionSubtitle}>
          Basado en citas realizadas con precio.
        </Text>

        {serviceStats.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no hay servicios con citas realizadas.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                Servicio
              </Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                Citas
              </Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                Total
              </Text>
            </View>
            {serviceStats.map(item => (
              <View key={item.service} style={styles.tableRow}>
                <Text style={[styles.tableCellText, { flex: 2 }]}>
                  {item.service}
                </Text>
                <Text style={[styles.tableCellText, { flex: 1 }]}>
                  {item.count}
                </Text>
                <Text style={[styles.tableCellText, { flex: 1 }]}>
                  ${item.revenue.toFixed(0)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20, paddingTop: 4,
    backgroundColor: Colors.screenBackground,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700', color: Colors.text, letterSpacing: -0.5},
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  moneyText: {
    fontSize: 22,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    fontSize: 12,
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
  chartContainer: {
    marginTop: 8,
    paddingVertical: 8,
  },
  chartInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  chartBar: {
    width: '70%',
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  chartBarValue: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  chartBarLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  chartEmptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tableCellText: {
    fontSize: 12,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
    dateInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 14,
    color: Colors.text,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  presetButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
  },

});
