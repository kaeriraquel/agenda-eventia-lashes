// app/(tabs)/agenda.tsx
// Calendario visual: semana o mes, con la lista del día en forma de línea de tiempo.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppointments, Appointment } from '../../context/AppointmentsContext';
import { Colors, Radii, Typography } from '../../constants/theme';
import { Screen, Chip, EmptyState, Fab, money } from '../../components/ui';
import { AppointmentRow } from '../../components/AppointmentRow';
import {
  addDays,
  dayNameShort,
  formatLongDate,
  monthName,
  parseDateKey,
  startOfWeek,
  todayKey,
  toLocalDateKey,
} from '../../lib/dates';

type ViewMode = 'semana' | 'mes';
type Filter = 'todas' | 'pendiente' | 'realizada';

const WEEK_HEAD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function AgendaScreen() {
  const router = useRouter();
  const { appointments } = useAppointments();

  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<ViewMode>('semana');
  const [filter, setFilter] = useState<Filter>('todas');
  // mes mostrado en la vista mensual (primer día del mes)
  const [monthCursor, setMonthCursor] = useState(() => today.slice(0, 8) + '01');

  // Citas agrupadas por fecha
  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appointments) {
      if (!a.date) continue;
      const list = m.get(a.date) ?? [];
      list.push(a);
      m.set(a.date, list);
    }
    for (const list of m.values()) list.sort((x, y) => (x.time || '').localeCompare(y.time || ''));
    return m;
  }, [appointments]);

  const countActive = (key: string) =>
    (byDate.get(key) ?? []).filter(a => a.status !== 'cancelada').length;

  const dayList = useMemo(() => {
    const list = byDate.get(selected) ?? [];
    return filter === 'todas' ? list : list.filter(a => a.status === filter);
  }, [byDate, selected, filter]);

  const dayTotal = useMemo(
    () =>
      (byDate.get(selected) ?? [])
        .filter(a => a.status !== 'cancelada' && a.status !== 'no_asistio')
        .reduce((s, a) => s + (a.price ?? 0), 0),
    [byDate, selected]
  );

  const selDate = parseDateKey(selected);
  const headerMonth =
    mode === 'mes'
      ? parseDateKey(monthCursor)
      : selDate;

  const goToday = () => {
    setSelected(today);
    setMonthCursor(today.slice(0, 8) + '01');
  };

  const selectDay = (key: string) => {
    setSelected(key);
    if (key.slice(0, 7) !== monthCursor.slice(0, 7)) setMonthCursor(key.slice(0, 8) + '01');
  };

  /* ---------- Semana ---------- */
  const weekStart = startOfWeek(selected);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* ---------- Mes ---------- */
  const monthCells = useMemo(() => {
    const first = parseDateKey(monthCursor);
    const lead = (first.getDay() + 6) % 7; // lunes = 0
    const start = addDays(monthCursor, -lead);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [monthCursor]);

  const shiftMonth = (n: number) => {
    const d = parseDateKey(monthCursor);
    d.setMonth(d.getMonth() + n);
    setMonthCursor(toLocalDateKey(d).slice(0, 8) + '01');
  };

  const newForSelected = () =>
    router.push({ pathname: '/appointment/new', params: { prefillDate: selected } });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.screenBackground }}>
      <Screen>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={Typography.overline}>{headerMonth.getFullYear()}</Text>
            <Text style={Typography.display}>
              {monthName(headerMonth.getMonth()).replace(/^./, c => c.toUpperCase())}
            </Text>
          </View>
          {selected !== today ? <Chip label="Hoy" onPress={goToday} /> : null}
          <View style={styles.segment}>
            {(['semana', 'mes'] as ViewMode[]).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.segItem, mode === m && styles.segItemActive]}
              >
                <Text style={[styles.segText, mode === m && styles.segTextActive]}>
                  {m === 'semana' ? 'Semana' : 'Mes'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {mode === 'semana' ? (
          <View style={styles.weekRow}>
            <TouchableOpacity onPress={() => selectDay(addDays(selected, -7))} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            {weekDays.map(k => {
              const d = parseDateKey(k);
              const isSel = k === selected;
              const isToday = k === today;
              const n = countActive(k);
              return (
                <TouchableOpacity
                  key={k}
                  onPress={() => selectDay(k)}
                  style={[styles.dayCell, isSel && styles.dayCellSel, !isSel && isToday && styles.dayCellToday]}
                >
                  <Text style={[styles.dayName, isSel && styles.textOnPrimary]}>{dayNameShort(d)}</Text>
                  <Text style={[styles.dayNum, isSel && styles.textOnPrimary]}>{d.getDate()}</Text>
                  <View style={styles.dotsRow}>
                    {Array.from({ length: Math.min(n, 3) }).map((_, i) => (
                      <View
                        key={i}
                        style={[styles.dot, { backgroundColor: isSel ? '#fff' : Colors.primary }]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => selectDay(addDays(selected, 7))} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.monthCard}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={Typography.heading}>
                {monthName(parseDateKey(monthCursor).getMonth()).replace(/^./, c => c.toUpperCase())}{' '}
                {parseDateKey(monthCursor).getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={10}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.gridRow}>
              {WEEK_HEAD.map((h, i) => (
                <Text key={i} style={styles.gridHead}>
                  {h}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {monthCells.map(k => {
                const d = parseDateKey(k);
                const inMonth = k.slice(0, 7) === monthCursor.slice(0, 7);
                const isSel = k === selected;
                const isToday = k === today;
                const n = countActive(k);
                return (
                  <TouchableOpacity key={k} style={styles.gridCell} onPress={() => selectDay(k)}>
                    <View
                      style={[
                        styles.gridDay,
                        isSel && styles.dayCellSel,
                        !isSel && isToday && styles.dayCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.gridNum,
                          !inMonth && { color: Colors.textSubtle },
                          isSel && styles.textOnPrimary,
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                    </View>
                    {n > 0 ? (
                      <Text style={[styles.gridCount, !inMonth && { opacity: 0.5 }]}>{n}</Text>
                    ) : (
                      <Text style={styles.gridCount}> </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Resumen del día */}
        <View style={styles.dayHeader}>
          <View style={{ flex: 1 }}>
            <Text style={Typography.heading}>
              {formatLongDate(selected).replace(/^./, c => c.toUpperCase())}
            </Text>
            <Text style={Typography.caption}>
              {countActive(selected)} {countActive(selected) === 1 ? 'cita' : 'citas'}
              {dayTotal > 0 ? ` · ${money(dayTotal)} estimado` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.filters}>
          <Chip label="Todas" active={filter === 'todas'} onPress={() => setFilter('todas')} />
          <Chip label="Pendientes" active={filter === 'pendiente'} onPress={() => setFilter('pendiente')} />
          <Chip label="Realizadas" active={filter === 'realizada'} onPress={() => setFilter('realizada')} />
        </View>

        {dayList.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title={filter === 'todas' ? 'Día libre' : 'Sin citas con ese filtro'}
            text={filter === 'todas' ? 'No hay citas agendadas para este día.' : undefined}
            action={filter === 'todas' ? 'Agendar cita' : undefined}
            onAction={newForSelected}
          />
        ) : (
          dayList.map(a => (
            <AppointmentRow
              key={a.id}
              appointment={a}
              onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: a.id } })}
            />
          ))
        )}
      </Screen>
      <Fab onPress={newForSelected} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 8, marginBottom: 16 },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radii.pill,
    padding: 3,
  },
  segItem: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radii.pill },
  segItemActive: { backgroundColor: Colors.cardBackground },
  segText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  segTextActive: { color: Colors.primary },

  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  dayCellSel: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayCellToday: { borderColor: Colors.primaryLight, borderWidth: 1.5 },
  dayName: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  dayNum: { fontSize: 17, fontWeight: '700', color: Colors.text, marginTop: 2 },
  textOnPrimary: { color: Colors.onPrimary },
  dotsRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  monthCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    padding: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  gridRow: { flexDirection: 'row' },
  gridHead: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSubtle,
    marginBottom: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  gridDay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gridNum: { fontSize: 14, fontWeight: '600', color: Colors.text },
  gridCount: { fontSize: 10, fontWeight: '700', color: Colors.primary, height: 13 },

  dayHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14 },
});
