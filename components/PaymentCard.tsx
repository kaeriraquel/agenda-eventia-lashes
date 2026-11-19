// components/PaymentCard.tsx
// Sección "Pago" de una cita: anticipo, propina, método y marcar como pagada.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Appointment, AppointmentStatus, PaymentMethod } from '../context/AppointmentsContext';
import { Colors, Typography } from '../constants/theme';
import { Card, Chip, Button, FieldLabel, formStyles, money } from './ui';
import { PAYMENT_METHODS, remainingOf } from '../lib/cash';

const parseMoney = (t: string): number | null => {
  const s = t.replace(/[$,\s]/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return isNaN(n) ? NaN : n;
};

export function PaymentCard({
  appointment: a,
  onSave,
}: {
  appointment: Appointment;
  onSave: (updates: Partial<Appointment>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [deposit, setDeposit] = useState('');
  const [tip, setTip] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);

  // cargar valores guardados (si no se está editando)
  useEffect(() => {
    if (editing) return;
    setDeposit(a.deposit != null ? String(a.deposit) : '');
    setTip(a.tip != null ? String(a.tip) : '');
    setMethod(a.paymentMethod ?? null);
  }, [a.deposit, a.tip, a.paymentMethod, editing]);

  const price = a.price ?? 0;
  const remaining = remainingOf(a);

  const save = async (markPaid?: boolean) => {
    const dep = parseMoney(deposit);
    const tp = parseMoney(tip);
    if (Number.isNaN(dep) || Number.isNaN(tp)) {
      Alert.alert('Revisa los montos', 'Escribe solo números en anticipo y propina.');
      return;
    }
    if (dep != null && price > 0 && dep > price) {
      Alert.alert('Anticipo mayor al precio', 'El anticipo no puede ser mayor que el precio del servicio.');
      return;
    }
    if (markPaid && !method) {
      Alert.alert('Método de pago', 'Elige cómo te pagó: efectivo, transferencia o tarjeta.');
      return;
    }
    setSaving(true);
    const updates: Partial<Appointment> = {
      deposit: dep,
      tip: tp,
      paymentMethod: method,
    };
    if (markPaid) {
      updates.paid = true;
      // si estaba pendiente, al cobrar se marca como realizada
      if (a.status === 'pendiente') updates.status = 'realizada' as AppointmentStatus;
    }
    const ok = await onSave(updates);
    setSaving(false);
    if (!ok) {
      Alert.alert(
        'No se guardó',
        'Revisa tu conexión. Si es la primera vez, recuerda correr en Supabase el archivo supabase/02_caja_y_pagos.sql.'
      );
      return;
    }
    setEditing(false);
  };

  const undoPaid = () =>
    Alert.alert('Quitar pago', '¿Marcar esta cita como NO pagada?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, quitar', style: 'destructive', onPress: () => onSave({ paid: false }) },
    ]);

  return (
    <Card style={{ marginTop: 12 }}>
      <View style={styles.headRow}>
        <Text style={Typography.heading}>Pago</Text>
        {a.paid ? (
          <View style={styles.paidPill}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.paidText}>Pagada</Text>
          </View>
        ) : !editing ? (
          <Button title="Editar" variant="ghost" small onPress={() => setEditing(true)} />
        ) : null}
      </View>

      {/* Resumen */}
      <View style={styles.lines}>
        <Line label="Precio del servicio" value={a.price != null ? money(price) : '—'} />
        <Line label="Anticipo" value={a.deposit ? `− ${money(a.deposit)}` : '—'} />
        {a.tip ? <Line label="Propina" value={money(a.tip)} /> : null}
        <View style={styles.divider} />
        <Line
          label={a.paid ? 'Total cobrado' : 'Falta por cobrar'}
          value={a.paid ? money(price + (a.tip ?? 0)) : money(remaining)}
          bold
        />
        {a.paid && a.paymentMethod ? (
          <Text style={[Typography.caption, { marginTop: 4 }]}>
            Pagado con {PAYMENT_METHODS.find(m => m.key === a.paymentMethod)?.label.toLowerCase()}
          </Text>
        ) : null}
      </View>

      {editing ? (
        <View>
          <View style={styles.twoCols}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Anticipo</FieldLabel>
              <TextInput
                style={formStyles.input}
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="decimal-pad"
                placeholder="$0"
                placeholderTextColor={Colors.textSubtle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Propina</FieldLabel>
              <TextInput
                style={formStyles.input}
                value={tip}
                onChangeText={setTip}
                keyboardType="decimal-pad"
                placeholder="$0"
                placeholderTextColor={Colors.textSubtle}
              />
            </View>
          </View>
          <FieldLabel>Método de pago</FieldLabel>
          <View style={styles.chips}>
            {PAYMENT_METHODS.map(m => (
              <Chip
                key={m.key}
                label={m.label}
                icon={m.icon}
                active={method === m.key}
                onPress={() => setMethod(method === m.key ? null : m.key)}
              />
            ))}
          </View>
          <Button title="Cobrar y marcar pagada" icon="checkmark-circle-outline" onPress={() => save(true)} loading={saving} style={{ marginTop: 16 }} />
          <View style={styles.twoCols}>
            <Button title="Solo guardar" variant="secondary" onPress={() => save(false)} style={{ flex: 1, marginTop: 10 }} />
            <Button title="Cancelar" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1, marginTop: 10 }} />
          </View>
        </View>
      ) : a.paid ? (
        <Button title="Quitar marca de pagada" variant="ghost" small onPress={undoPaid} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
      ) : (
        <Button title="Registrar pago" icon="wallet-outline" onPress={() => setEditing(true)} style={{ marginTop: 14 }} />
      )}
    </Card>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.lineValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paidText: { color: Colors.success, fontWeight: '700', fontSize: 12 },
  lines: { marginTop: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lineLabel: { fontSize: 14, color: Colors.textMuted },
  lineValue: { fontSize: 14, color: Colors.text },
  bold: { fontWeight: '700', color: Colors.text, fontSize: 16 },
  divider: { height: 1, backgroundColor: Colors.borderSoft, marginVertical: 6 },
  twoCols: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
