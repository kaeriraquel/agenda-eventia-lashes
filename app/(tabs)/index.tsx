// app/(tabs)/index.tsx
// Inicio: resumen del día, próxima cita, recordatorios de mañana y retoques sugeridos.
import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppointments, Appointment } from '../../context/AppointmentsContext';
import { useBrand } from '../../context/BrandContext';
import { Colors, Radii, Typography, Shadow } from '../../constants/theme';
import {
  Screen,
  Card,
  SectionHeader,
  StatTile,
  EmptyState,
  Avatar,
  Button,
  Fab,
  money,
} from '../../components/ui';
import { AppointmentRow } from '../../components/AppointmentRow';
import { addDays, formatLongDate, formatShortDate, formatTime12, todayKey } from '../../lib/dates';
import { fillTemplate, openWhatsApp } from '../../lib/whatsapp';
import { getRetouchSuggestions, useSentReminders } from '../../lib/reminders';
import { summarize } from '../../lib/cash';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export default function HomeScreen() {
  const router = useRouter();
  const { appointments } = useAppointments();
  const { brandName, logoUri, reminderTemplate, retouchTemplate, retouchDays } = useBrand();
  const { sent, markSent } = useSentReminders();

  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const nowHM = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();

  const todays = useMemo(
    () =>
      appointments
        .filter(a => a.date === today && a.status !== 'cancelada')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  const next: Appointment | undefined = useMemo(
    () =>
      appointments
        .filter(
          a =>
            a.status === 'pendiente' &&
            (a.date > today || (a.date === today && a.time >= nowHM))
        )
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0],
    [appointments, today, nowHM]
  );

  const tomorrowList = useMemo(
    () =>
      appointments
        .filter(a => a.date === tomorrow && a.status === 'pendiente')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, tomorrow]
  );

  const retouches = useMemo(
    () => getRetouchSuggestions(appointments, retouchDays).slice(0, 5),
    [appointments, retouchDays]
  );

  const todayCash = useMemo(() => summarize(appointments.filter(a => a.date === today)), [appointments, today]);
  const weekCash = useMemo(() => {
    const from = addDays(today, -6);
    return summarize(appointments.filter(a => a.date >= from && a.date <= today));
  }, [appointments, today]);

  const sendReminder = async (a: Appointment) => {
    const text = fillTemplate(reminderTemplate, {
      nombre: a.clientName,
      fecha: a.date,
      hora: a.time,
      servicio: a.service,
      negocio: brandName,
    });
    if (await openWhatsApp(a.phone, text)) markSent(`rem:${a.id}`);
  };

  const sendRetouch = async (r: (typeof retouches)[number]) => {
    const text = fillTemplate(retouchTemplate, {
      nombre: r.clientName,
      servicio: r.lastService,
      negocio: brandName,
      dias: r.daysSince,
    });
    if (await openWhatsApp(r.phone, text)) markSent(`ret:${r.key}:${r.lastDate}`);
  };

  const openAppt = (a: Appointment) =>
    router.push({ pathname: '/appointment/[id]', params: { id: a.id } });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.screenBackground }}>
      <Screen>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={Typography.overline}>{greeting()}</Text>
            <Text style={Typography.display} numberOfLines={1}>
              {brandName}
            </Text>
            <Text style={[Typography.bodyMuted, { marginTop: 2 }]}>
              {formatLongDate(today).replace(/^./, c => c.toUpperCase())}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/configuracion')}>
            <Image
              source={logoUri ? { uri: logoUri } : require('../../assets/images/logo-eventia-agenda.png')}
              style={styles.logo}
            />
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={styles.tiles}>
          <StatTile label="Citas hoy" value={todays.length} icon="calendar-outline" />
          <StatTile label="Cobrado hoy" value={money(todayCash.collected)} icon="wallet-outline" tone="success" />
          <StatTile label="Últimos 7 días" value={money(weekCash.collected)} icon="trending-up-outline" tone="info" />
        </View>

        {/* Próxima cita */}
        {next ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => openAppt(next)} style={styles.nextCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>
                Próxima cita · {next.date === today ? 'Hoy' : next.date === tomorrow ? 'Mañana' : formatShortDate(next.date)}
              </Text>
              <Text style={styles.nextTime}>{formatTime12(next.time)}</Text>
              <Text style={styles.nextName} numberOfLines={1}>
                {next.clientName}
              </Text>
              <Text style={styles.nextService} numberOfLines={1}>
                {next.service}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        ) : null}

        {/* Hoy */}
        <SectionHeader title="Hoy" action="Ver agenda" onAction={() => router.push('/(tabs)/agenda')} />
        {todays.length === 0 ? (
          <Card>
            <EmptyState
              icon="sunny-outline"
              title="Sin citas hoy"
              text="Aprovecha para promocionarte o descansar ✨"
              action="Agendar cita"
              onAction={() => router.push('/appointment/new')}
            />
          </Card>
        ) : (
          todays.map(a => <AppointmentRow key={a.id} appointment={a} onPress={() => openAppt(a)} />)
        )}

        {/* Recordatorios de mañana */}
        {tomorrowList.length > 0 ? (
          <>
            <SectionHeader title={`Recordar citas de mañana · ${tomorrowList.length}`} />
            <Card style={{ paddingVertical: 4 }}>
              {tomorrowList.map((a, i) => {
                const done = !!sent[`rem:${a.id}`];
                return (
                  <View key={a.id} style={[styles.remRow, i < tomorrowList.length - 1 && styles.remBorder]}>
                    <Avatar name={a.clientName} size={38} />
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openAppt(a)}>
                      <Text style={styles.remName} numberOfLines={1}>
                        {a.clientName}
                      </Text>
                      <Text style={Typography.caption} numberOfLines={1}>
                        {formatTime12(a.time)} · {a.service}
                      </Text>
                    </TouchableOpacity>
                    {done ? (
                      <View style={styles.sentPill}>
                        <Ionicons name="checkmark" size={14} color={Colors.success} />
                        <Text style={styles.sentText}>Enviado</Text>
                      </View>
                    ) : (
                      <Button title="Enviar" icon="logo-whatsapp" variant="whatsapp" small onPress={() => sendReminder(a)} />
                    )}
                  </View>
                );
              })}
            </Card>
          </>
        ) : null}

        {/* Retoques sugeridos */}
        <SectionHeader title="Les toca retoque" action="Ajustar" onAction={() => router.push('/recordatorios')} />
        {retouches.length === 0 ? (
          <Card>
            <Text style={Typography.bodyMuted}>
              Aquí aparecerán las clientas que ya llevan unos {retouchDays} días desde su último servicio
              y no tienen cita agendada.
            </Text>
          </Card>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {retouches.map((r, i) => {
              const done = !!sent[`ret:${r.key}:${r.lastDate}`];
              return (
                <View key={r.key} style={[styles.remRow, i < retouches.length - 1 && styles.remBorder]}>
                  <Avatar name={r.clientName} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remName} numberOfLines={1}>
                      {r.clientName}
                    </Text>
                    <Text style={Typography.caption} numberOfLines={1}>
                      Hace {r.daysSince} días · {r.lastService}
                    </Text>
                  </View>
                  {done ? (
                    <View style={styles.sentPill}>
                      <Ionicons name="checkmark" size={14} color={Colors.success} />
                      <Text style={styles.sentText}>Avisada</Text>
                    </View>
                  ) : (
                    <Button title="Avisar" icon="logo-whatsapp" variant="whatsapp" small onPress={() => sendRetouch(r)} />
                  )}
                </View>
              );
            })}
          </Card>
        )}

        <Text style={styles.powered}>hecho con cariño por Eventia SLW</Text>
      </Screen>
      <Fab onPress={() => router.push('/appointment/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 18 },
  logo: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primarySoft },
  tiles: { flexDirection: 'row', gap: 10 },
  nextCard: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    borderRadius: Radii.card,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.floating,
  },
  nextLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  nextTime: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  nextName: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 2 },
  nextService: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 1 },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  remBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSoft },
  remName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  sentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  sentText: { color: Colors.success, fontSize: 12, fontWeight: '700' },
  powered: { textAlign: 'center', color: Colors.textSubtle, fontSize: 11, marginTop: 28 },
});
