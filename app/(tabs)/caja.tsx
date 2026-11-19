// app/(tabs)/caja.tsx
// Caja: lo cobrado por día/semana/mes, por método de pago, y lo pendiente por cobrar.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppointments } from '../../context/AppointmentsContext';
import { useBrand } from '../../context/BrandContext';
import { Colors, Radii, Typography } from '../../constants/theme';
import { Screen, ScreenHeader, Card, SectionHeader, EmptyState, Button, StatTile, money } from '../../components/ui';
import { AppointmentRow } from '../../components/AppointmentRow';
import { PAYMENT_METHODS, summarize, remainingOf } from '../../lib/cash';
import {
  addDays,
  formatLongDate,
  formatShortDate,
  monthName,
  parseDateKey,
  relativeDayLabel,
  startOfWeek,
  todayKey,
  toLocalDateKey,
} from '../../lib/dates';

type Period = 'dia' | 'semana' | 'mes';

function rangeOf(period: Period, anchor: string): [string, string] {
  if (period === 'dia') return [anchor, anchor];
  if (period === 'semana') {
    const s = startOfWeek(anchor);
    return [s, addDays(s, 6)];
  }
  const d = parseDateKey(anchor);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [toLocalDateKey(first), toLocalDateKey(last)];
}

export default function CajaScreen() {
  const router = useRouter();
  const { appointments } = useAppointments();
  const { brandName } = useBrand();

  const [period, setPeriod] = useState<Period>('dia');
  const [anchor, setAnchor] = useState(todayKey());

  const [from, to] = rangeOf(period, anchor);

  const list = useMemo(
    () => appointments.filter(a => a.date >= from && a.date <= to),
    [appointments, from, to]
  );
  const s = useMemo(() => summarize(list), [list]);

  // Pendientes de cobro de CUALQUIER fecha (no solo del periodo)
  const allPending = useMemo(
    () =>
      appointments
        .filter(a => a.status === 'realizada' && !a.paid && remainingOf(a) > 0)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [appointments]
  );
  const allPendingAmount = allPending.reduce((t, a) => t + remainingOf(a), 0);

  const shift = (n: number) => {
    if (period === 'dia') setAnchor(addDays(anchor, n));
    else if (period === 'semana') setAnchor(addDays(anchor, 7 * n));
    else {
      const d = parseDateKey(anchor);
      d.setMonth(d.getMonth() + n, 1);
      setAnchor(toLocalDateKey(d));
    }
  };

  const periodLabel =
    period === 'dia'
      ? relativeDayLabel(anchor) === 'Hoy'
        ? `Hoy, ${formatShortDate(anchor)}`
        : formatLongDate(anchor).replace(/^./, c => c.toUpperCase())
      : period === 'semana'
        ? `${formatShortDate(from)} – ${formatShortDate(to)}`
        : `${monthName(parseDateKey(anchor).getMonth()).replace(/^./, c => c.toUpperCase())} ${parseDateKey(anchor).getFullYear()}`;

  const shareCorte = () => {
    const lines = [
      `💰 Corte de caja · ${brandName}`,
      periodLabel,
      '',
      `Cobrado: ${money(s.collected)} (${s.paidCount} servicios)`,
      ...PAYMENT_METHODS.map(m => `• ${m.label}: ${money(s.byMethod[m.key])}`),
      s.byMethod.sin_metodo > 0 ? `• Sin método: ${money(s.byMethod.sin_metodo)}` : '',
      `Propinas: ${money(s.tips)}`,
      `Anticipos recibidos (citas por realizar): ${money(s.deposits)}`,
      `Por cobrar: ${money(s.pendingAmount)}`,
    ].filter(Boolean);
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  return (
    <Screen>
      <ScreenHeader
        title="Caja"
        subtitle="Ingresos y cobros"
        right={
          <TouchableOpacity onPress={shareCorte} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Periodo */}
      <View style={styles.segment}>
        {(['dia', 'semana', 'mes'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => {
              setPeriod(p);
              setAnchor(todayKey());
            }}
            style={[styles.segItem, period === p && styles.segItemActive]}
          >
            <Text style={[styles.segText, period === p && styles.segTextActive]}>
              {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.periodNav}>
        <TouchableOpacity onPress={() => shift(-1)} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        <Text style={Typography.heading}>{periodLabel}</Text>
        <TouchableOpacity onPress={() => shift(1)} hitSlop={10}>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Total cobrado */}
      <Card style={styles.totalCard}>
        <Text style={styles.totalLabel}>Cobrado</Text>
        <Text style={styles.totalValue}>{money(s.collected)}</Text>
        <Text style={styles.totalSub}>
          {s.paidCount} {s.paidCount === 1 ? 'servicio cobrado' : 'servicios cobrados'}
          {s.tips > 0 ? ` · ${money(s.tips)} en propinas` : ''}
        </Text>

        <View style={styles.methods}>
          {PAYMENT_METHODS.map(m => (
            <View key={m.key} style={styles.methodRow}>
              <View style={styles.methodIcon}>
                <Ionicons name={m.icon} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.methodLabel}>{m.label}</Text>
              <Text style={styles.methodValue}>{money(s.byMethod[m.key])}</Text>
            </View>
          ))}
          {s.byMethod.sin_metodo > 0 ? (
            <View style={styles.methodRow}>
              <View style={styles.methodIcon}>
                <Ionicons name="help-outline" size={16} color={Colors.textMuted} />
              </View>
              <Text style={styles.methodLabel}>Sin método</Text>
              <Text style={styles.methodValue}>{money(s.byMethod.sin_metodo)}</Text>
            </View>
          ) : null}
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile label="Anticipos recibidos" value={money(s.deposits)} icon="time-outline" tone="info" />
        <StatTile label="Por cobrar (periodo)" value={money(s.pendingAmount)} icon="alert-circle-outline" tone="warning" />
      </View>

      <SectionHeader title={`Pendientes de cobro${allPending.length ? ` · ${money(allPendingAmount)}` : ''}`} />
      {allPending.length === 0 ? (
        <Card>
          <EmptyState icon="checkmark-done-outline" title="Todo cobrado" text="No tienes servicios realizados sin pagar." />
        </Card>
      ) : (
        allPending.slice(0, 10).map(a => (
          <AppointmentRow
            key={a.id}
            appointment={a}
            showDate={relativeDayLabel(a.date)}
            onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: a.id } })}
            right={<Text style={styles.owed}>Debe {money(remainingOf(a))}</Text>}
          />
        ))
      )}

      <SectionHeader title="Cobros del periodo" />
      {s.paidList.length === 0 ? (
        <Card>
          <EmptyState
            icon="wallet-outline"
            title="Sin cobros"
            text="Cuando marques una cita como pagada aparecerá aquí."
          />
        </Card>
      ) : (
        s.paidList
          .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
          .map(a => (
            <AppointmentRow
              key={a.id}
              appointment={a}
              showDate={period === 'dia' ? undefined : relativeDayLabel(a.date)}
              onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: a.id } })}
            />
          ))
      )}

      <Button title="Compartir corte de caja" icon="share-social-outline" variant="secondary" onPress={shareCorte} style={{ marginTop: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radii.pill,
    padding: 3,
  },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: Radii.pill, alignItems: 'center' },
  segItemActive: { backgroundColor: Colors.cardBackground },
  segText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  segTextActive: { color: Colors.primary },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  totalCard: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  totalSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  methods: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  methodIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  methodValue: { fontSize: 15, fontWeight: '700', color: Colors.text },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 12 },
  owed: { fontSize: 12, fontWeight: '700', color: Colors.warning },
});
