// app/client/detail.tsx
// Perfil de clienta: contacto, números, última ficha técnica e historial.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Linking, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppointments } from '../../context/AppointmentsContext';
import { useBrand } from '../../context/BrandContext';
import { Colors, Typography } from '../../constants/theme';
import { normalizePhone } from '../../lib/phone';
import { Avatar, Button, Card, SectionHeader, StatTile, EmptyState, money } from '../../components/ui';
import { AppointmentRow } from '../../components/AppointmentRow';
import { formatShortDate, relativeDayLabel } from '../../lib/dates';
import { openWhatsApp } from '../../lib/whatsapp';

export default function ClientDetailScreen() {
  const router = useRouter();
  const { appointments } = useAppointments();
  const { brandName } = useBrand();
  const params = useLocalSearchParams();

  const name = String(params.name ?? '').trim();
  const phone = String(params.phone ?? '').trim();
  const phoneNorm = normalizePhone(phone);

  const list = useMemo(
    () =>
      appointments
        .filter(a => {
          const aName = (a.clientName ?? '').trim().toLowerCase();
          if (!name) return false;
          if (phoneNorm) {
            return aName === name.toLowerCase() && normalizePhone(a.phone ?? '') === phoneNorm;
          }
          return aName === name.toLowerCase();
        })
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
    [appointments, name, phoneNorm]
  );

  const stats = useMemo(() => {
    let spent = 0;
    let done = 0;
    let noShow = 0;
    for (const a of list) {
      if (a.status === 'realizada') {
        done++;
        spent += (a.price ?? 0) + (a.tip ?? 0);
      }
      if (a.status === 'no_asistio') noShow++;
    }
    const last = list.find(a => a.status === 'realizada');
    return { spent, done, noShow, last };
  }, [list]);

  // Última ficha técnica guardada (lo que más consultan antes de un retoque)
  const lastSheet = useMemo(() => list.find(a => a.technicalSheet)?.technicalSheet as any, [list]);

  return (
    <ScrollView style={{ backgroundColor: Colors.screenBackground }} contentContainerStyle={styles.container}>
      <Card style={styles.hero}>
        <Avatar name={name} size={64} />
        <Text style={[Typography.title, { marginTop: 10, textAlign: 'center' }]}>{name || 'Clienta'}</Text>
        <Text style={[Typography.bodyMuted, { marginTop: 2 }]}>{phone || 'Sin teléfono'}</Text>
        {phone ? (
          <View style={styles.actions}>
            <Button
              title="WhatsApp"
              icon="logo-whatsapp"
              variant="whatsapp"
              small
              style={{ flex: 1 }}
              onPress={() => openWhatsApp(phone, `Hola ${name.split(' ')[0]} 💕 — ${brandName}`)}
            />
            <Button
              title="Llamar"
              icon="call-outline"
              variant="secondary"
              small
              style={{ flex: 1 }}
              onPress={() => Linking.openURL(`tel:${phone}`)}
            />
          </View>
        ) : null}
      </Card>

      <View style={styles.tiles}>
        <StatTile label="Visitas" value={stats.done} icon="checkmark-done-outline" />
        <StatTile label="Total gastado" value={money(stats.spent)} icon="wallet-outline" tone="success" />
        <StatTile
          label="Última visita"
          value={stats.last ? formatShortDate(stats.last.date) : '—'}
          icon="time-outline"
          tone="info"
        />
      </View>
      {stats.noShow > 0 ? (
        <Text style={styles.warn}>⚠️ No asistió {stats.noShow} {stats.noShow === 1 ? 'vez' : 'veces'}</Text>
      ) : null}

      {lastSheet ? (
        <>
          <SectionHeader title="Última ficha técnica" />
          <Card>
            {(lastSheet.kind === 'nails'
              ? [
                  ['Técnica', lastSheet.technique],
                  ['Forma', lastSheet.shape],
                  ['Largo', lastSheet.length],
                  ['Color', lastSheet.color],
                  ['Acabado', lastSheet.finish],
                ]
              : [
                  ['Aplicación', lastSheet.applicationType],
                  ['Curva', lastSheet.curl],
                  ['Grosor', lastSheet.thickness],
                  ['Longitudes', lastSheet.lengths],
                  ['Diseño', lastSheet.design],
                  ['Adhesivo', lastSheet.adhesive],
                ]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <View key={k} style={styles.sheetRow}>
                  <Text style={styles.sheetKey}>{k}</Text>
                  <Text style={styles.sheetVal}>{v}</Text>
                </View>
              ))}
            {lastSheet.notes ? <Text style={[Typography.bodyMuted, { marginTop: 8 }]}>{lastSheet.notes}</Text> : null}
          </Card>
        </>
      ) : null}

      <SectionHeader title={`Historial · ${list.length}`} />
      {list.length === 0 ? (
        <Card>
          <EmptyState icon="calendar-outline" title="Sin citas" text="Aún no hay citas para esta clienta." />
        </Card>
      ) : (
        list.map(a => (
          <AppointmentRow
            key={a.id}
            appointment={a}
            showDate={relativeDayLabel(a.date)}
            onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: a.id } })}
          />
        ))
      )}

      <Button
        title="Nueva cita para esta clienta"
        icon="add"
        style={{ marginTop: 16 }}
        onPress={() =>
          router.push({
            pathname: '/appointment/new',
            params: { prefillName: name, prefillPhone: phone },
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 4, paddingBottom: 60 },
  hero: { alignItems: 'center', paddingVertical: 22 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 12 },
  warn: { marginTop: 10, color: Colors.warning, fontWeight: '600', fontSize: 13 },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  sheetKey: { color: Colors.textMuted, fontSize: 14 },
  sheetVal: { color: Colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
