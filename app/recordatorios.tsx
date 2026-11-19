// app/recordatorios.tsx
// Configurar los mensajes de WhatsApp (recordatorio de cita y aviso de retoque).
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { Screen, Card, Button, FieldLabel, formStyles, SectionHeader, Chip } from '../components/ui';
import { Colors, Typography } from '../constants/theme';
import {
  useBrand,
  DEFAULT_REMINDER_TEMPLATE,
  DEFAULT_RETOUCH_TEMPLATE,
} from '../context/BrandContext';
import { fillTemplate } from '../lib/whatsapp';
import { addDays, todayKey } from '../lib/dates';

const RETOUCH_OPTIONS = [14, 21, 28, 35];

export default function RecordatoriosScreen() {
  const {
    brandName,
    reminderTemplate,
    retouchTemplate,
    retouchDays,
    setReminderTemplate,
    setRetouchTemplate,
    setRetouchDays,
  } = useBrand();

  const [rem, setRem] = useState(reminderTemplate);
  const [ret, setRet] = useState(retouchTemplate);
  const [days, setDays] = useState(retouchDays);

  const sample = {
    nombre: 'Ana López',
    fecha: addDays(todayKey(), 1),
    hora: '16:30',
    servicio: 'Extensiones volumen',
    negocio: brandName,
    dias: days,
  };

  const save = () => {
    setReminderTemplate(rem.trim() || DEFAULT_REMINDER_TEMPLATE);
    setRetouchTemplate(ret.trim() || DEFAULT_RETOUCH_TEMPLATE);
    setRetouchDays(days);
    Alert.alert('Guardado', 'Tus mensajes se actualizaron.');
  };

  return (
    <Screen edges={[]}>
      <Text style={Typography.bodyMuted}>
        Estos textos se usan al tocar los botones de WhatsApp. Puedes usar estas palabras y se
        reemplazan solas:
      </Text>
      <View style={styles.vars}>
        {['{nombre}', '{fecha}', '{hora}', '{servicio}', '{negocio}', '{dias}'].map(v => (
          <View key={v} style={styles.varPill}>
            <Text style={styles.varText}>{v}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Recordatorio de cita" />
      <Card>
        <TextInput
          style={[formStyles.input, styles.area]}
          value={rem}
          onChangeText={setRem}
          multiline
        />
        <FieldLabel>Vista previa</FieldLabel>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{fillTemplate(rem, sample)}</Text>
        </View>
        <Button
          title="Restaurar texto original"
          variant="ghost"
          small
          onPress={() => setRem(DEFAULT_REMINDER_TEMPLATE)}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
        />
      </Card>

      <SectionHeader title="Aviso de retoque" />
      <Card>
        <Text style={Typography.bodyMuted}>
          Te sugerimos avisar a tus clientas cuando ya les toque retoque.
        </Text>
        <FieldLabel>Cada cuántos días</FieldLabel>
        <View style={styles.row}>
          {RETOUCH_OPTIONS.map(d => (
            <Chip key={d} label={`${d} días`} active={days === d} onPress={() => setDays(d)} />
          ))}
        </View>

        <FieldLabel>Mensaje</FieldLabel>
        <TextInput
          style={[formStyles.input, styles.area]}
          value={ret}
          onChangeText={setRet}
          multiline
        />
        <FieldLabel>Vista previa</FieldLabel>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{fillTemplate(ret, sample)}</Text>
        </View>
        <Button
          title="Restaurar texto original"
          variant="ghost"
          small
          onPress={() => setRet(DEFAULT_RETOUCH_TEMPLATE)}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
        />
      </Card>

      <Button title="Guardar mensajes" icon="checkmark" onPress={save} style={{ marginTop: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  vars: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  varPill: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  varText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '600' },
  area: { minHeight: 96, textAlignVertical: 'top' },
  bubble: {
    backgroundColor: '#E7F8EE',
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 12,
  },
  bubbleText: { color: '#1E3B2C', fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
