// app/appointment/new.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppointments } from '../../context/AppointmentsContext';
import { SelectField } from '../../components/SelectField';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useBrand } from '../../context/BrandContext';

type ServiceModule = 'lashes' | 'nails';

const LASHES_SERVICE_OPTIONS = [
  'Extensiones clásicas 1x1',
  'Extensiones híbridas',
  'Extensiones volumen',
  'Extensiones mega volumen',
  'Lifting de pestañas',
  'Retoque de pestañas',
  'Retiro de extensiones',
  'Otro (especificar)',
];

const NAILS_SERVICE_OPTIONS = [
  'Gelish',
  'Acrílico',
  'Polygel',
  'Esculpidas',
  'Retoque',
  'Retiro',
  'Nail art',
  'Otro (especificar)',
];

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { addAppointment } = useAppointments();
  const { enabledServices } = useBrand();

  // ✅ Si solo tiene 1 servicio activo, ese será el default
  const defaultModule: ServiceModule = useMemo(() => {
    if (enabledServices.includes('lashes') && !enabledServices.includes('nails')) return 'lashes';
    if (enabledServices.includes('nails') && !enabledServices.includes('lashes')) return 'nails';
    return 'lashes'; // si tiene ambos, default pestañas
  }, [enabledServices]);

  const [module, setModule] = useState<ServiceModule>(defaultModule);

  const [clientName, setClientName] = useState('');
  const [serviceOption, setServiceOption] = useState('');
  const [customService, setCustomService] = useState('');
  const [notes, setNotes] = useState('');

  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);

  const [dateStr, setDateStr] = useState(isoDate);
  const [timeStr, setTimeStr] = useState('10:00');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ✅ Opciones según módulo
  const serviceOptions = useMemo(() => {
    const base = module === 'nails' ? NAILS_SERVICE_OPTIONS : LASHES_SERVICE_OPTIONS;
    return base;
  }, [module]);

  // ✅ Si cambias módulo, resetea servicio para evitar mismatch
  const handleChangeModule = (m: ServiceModule) => {
    setModule(m);
    setServiceOption('');
    setCustomService('');
  };

  const handleSave = async () => {
    const finalService =
      serviceOption === 'Otro (especificar)' ? customService : serviceOption;

    if (!clientName.trim() || !finalService.trim() || !dateStr.trim() || !timeStr.trim()) {
      Alert.alert('Campos incompletos', 'Llena clienta, servicio, fecha y hora.');
      return;
    }

    await addAppointment({
      clientName: clientName.trim(),
      service: finalService.trim(),
      notes: notes.trim(),
      date: dateStr.trim(),
      time: timeStr.trim(),
      module:'lashes', // ✅ se guarda el tipo
    });

    Alert.alert('Cita creada', 'La cita se agregó a tu agenda.');
    router.replace('/(tabs)');
  };

  const onDateSelected = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().slice(0, 10);
      setDateStr(formatted);
    }
  };

  const onTimeSelected = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    }
  };

  const showCustomServiceInput = serviceOption === 'Otro (especificar)';

  // ✅ Si solo hay un servicio habilitado, no mostramos selector
  const showModuleSelector = enabledServices.includes('lashes') && enabledServices.includes('nails');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>

        {showModuleSelector ? (
          <View style={styles.moduleCard}>
            <Text style={styles.label}>Tipo de servicio *</Text>
            <View style={styles.moduleRow}>
              <TouchableOpacity
                style={[styles.moduleChip, module === 'lashes' && styles.moduleChipActive]}
                onPress={() => handleChangeModule('lashes')}
              >
                <Text style={[styles.moduleChipText, module === 'lashes' && styles.moduleChipTextActive]}>
                  Pestañas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moduleChip, module === 'nails' && styles.moduleChipActive]}
                onPress={() => handleChangeModule('nails')}
              >
                <Text style={[styles.moduleChipText, module === 'nails' && styles.moduleChipTextActive]}>
                  Uñas
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <Text style={styles.label}>Nombre de la clienta *</Text>
        <TextInput
          style={styles.input}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Ej. Ana López"
        />

        <SelectField
          label="Servicio *"
          value={serviceOption}
          onChange={setServiceOption}
          options={serviceOptions}
          placeholder="Selecciona un servicio"
        />

        {showCustomServiceInput && (
          <>
            <Text style={styles.label}>Especifica el servicio</Text>
            <TextInput
              style={styles.input}
              value={customService}
              onChangeText={setCustomService}
              placeholder="Describe el servicio"
            />
          </>
        )}

        <Text style={styles.label}>Fecha *</Text>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.input}
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="2025-11-25"
          />
        ) : (
          <>
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.selectorText}>{dateStr}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker mode="date" value={today} onChange={onDateSelected} />
            )}
          </>
        )}

        <Text style={styles.label}>Hora *</Text>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.input}
            value={timeStr}
            onChangeText={setTimeStr}
            placeholder="15:30"
          />
        ) : (
          <>
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.selectorText}>{timeStr}</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker mode="time" value={today} onChange={onTimeSelected} />
            )}
          </>
        )}

        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Sensibilidad, recomendaciones, etc."
          multiline
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar cita</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFF7FC',
    flexGrow: 1,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD1E8',
    marginBottom: 10,
  },
  moduleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  moduleChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFD1E8',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  moduleChipActive: {
    backgroundColor: '#FF6FB5',
    borderColor: '#FF6FB5',
  },
  moduleChipText: {
    fontSize: 13,
    color: '#FF6FB5',
    fontWeight: '600',
  },
  moduleChipTextActive: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#FFD1E8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectorBtn: {
    borderWidth: 1,
    borderColor: '#FFD1E8',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  selectorText: {
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#FF6FB5',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
