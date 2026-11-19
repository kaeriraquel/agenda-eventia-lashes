// app/appointment/new.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';

import { SelectField } from '../../components/SelectField';
import { useAppointments, ServiceModule } from '../../context/AppointmentsContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { normalizePhone } from '../../lib/phone';
import { useBrand } from '../../context/BrandContext';
import { toLocalDateKey, parseDateKey } from '../../lib/dates';
import { Colors } from '../../constants/theme';

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  phone_normalized: string | null;
};

const LASHES_OPTIONS = [
  'Extensiones clásicas 1x1',
  'Extensiones híbridas',
  'Extensiones volumen',
  'Extensiones mega volumen',
  'Lifting de pestañas',
  'Laminado de ceja',
  'Lifting + laminado de ceja',
  'Retoque de pestañas',
  'Retiro de extensiones',
  'Otro (especificar)',
];

const NAILS_OPTIONS = [
  'Gel semipermanente',
  'Acrílico',
  'Polygel',
  'Baño de acrílico',
  'Tip / Escultural',
  'Relleno',
  'Retiro',
  'Nail art',
  'Otro (especificar)',
];

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { addAppointment, appointments } = useAppointments();
  const { user } = useAuth();
  const isPro = !!user?.id;

  const { enabledServices } = useBrand();

  // ===== Módulo =====
  const defaultModule: ServiceModule =
    (enabledServices?.[0] as ServiceModule) ?? 'lashes';

  const [module, setModule] = useState<ServiceModule>(defaultModule);
  const hasMultipleModules = (enabledServices?.length ?? 0) > 1;

  useEffect(() => {
    if (!enabledServices || enabledServices.length === 0) return;
    if (!enabledServices.includes(module)) {
      setModule(enabledServices[0] as ServiceModule);
    }
  }, [enabledServices, module]);

  // ===== Services desde DB =====
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    const loadServices = async () => {
      // fallback: hardcodeado
      const fallback = module === 'nails' ? NAILS_OPTIONS : LASHES_OPTIONS;

      // sin sesión: no hay DB
      if (!user?.id) {
        setServiceOptions(fallback);
        return;
      }

      try {
        setLoadingServices(true);

        const { data, error } = await supabase
          .from('services')
          .select('name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('category', 'servicio')
          .eq('module', module)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;

        const names = (data ?? []).map((r: any) => String(r.name));
        setServiceOptions(names.length ? names : fallback);
      } catch (e) {
        console.error('Error cargando services:', e);
        setServiceOptions(fallback);
      } finally {
        setLoadingServices(false);
      }
    };

    loadServices();
  }, [user?.id, module]);

  // ===== Clienta =====
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);

  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // ===== Form =====
  const [serviceOption, setServiceOption] = useState('');
  const [customService, setCustomService] = useState('');
  const [notes, setNotes] = useState('');

  const today = new Date();
  const isoDate = toLocalDateKey(today);
  const [dateStr, setDateStr] = useState(isoDate);
  const [timeStr, setTimeStr] = useState('10:00');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Limpia servicio cuando cambia el módulo
  useEffect(() => {
    setServiceOption('');
    setCustomService('');
  }, [module]);

  // Buscar clientas (debounce)
  useEffect(() => {
    const q = clientQuery.trim();

    const t = setTimeout(async () => {
      if (q.length < 2) {
        setClientResults([]);
        return;
      }

      // PRO: buscar en Supabase
      if (isPro && user?.id) {
        try {
          setLoadingClients(true);

          const qDigits = normalizePhone(q);
          const orParts = [`name.ilike.%${q}%`];
          if (qDigits) orParts.push(`phone_normalized.ilike.%${qDigits}%`);

          const { data, error } = await supabase
            .from('clients')
            .select('id,name,phone,phone_normalized')
            .eq('user_id', user.id)
            .or(orParts.join(','))
            .order('name', { ascending: true })
            .limit(8);

          if (error) throw error;
          setClientResults((data ?? []) as ClientRow[]);
        } catch (e) {
          console.error(e);
          setClientResults([]);
        } finally {
          setLoadingClients(false);
        }
        return;
      }

      // GRATIS: sugerencias desde citas locales
      const lower = q.toLowerCase();
      const map = new Map<string, ClientRow>();

      for (const a of appointments) {
        const name = (a.clientName || '').trim();
        if (!name) continue;

        const phoneN = normalizePhone(a.phone || '');
        const qN = normalizePhone(q);

        const hit =
          name.toLowerCase().includes(lower) ||
          (!!phoneN && !!qN && phoneN.includes(qN));

        if (!hit) continue;

        const key = phoneN ? `${name}::${phoneN}` : name;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name,
            phone: a.phone ?? null,
            phone_normalized: phoneN,
          });
        }
      }

      setClientResults(Array.from(map.values()).slice(0, 8));
    }, 300);

    return () => clearTimeout(t);
  }, [clientQuery, isPro, user?.id, appointments]);

  const pickClient = (c: ClientRow) => {
    setSelectedClient(c);
    setClientQuery(c.name);
    setNewClientName('');
    setNewClientPhone(c.phone ?? '');
    setClientResults([]);
  };

  // Crear/obtener clienta
  const ensureClientPro = async (): Promise<{
    clientId: string | null;
    name: string;
    phone: string;
  }> => {
    const name = (selectedClient?.name || newClientName || clientQuery).trim();
    const phone = (selectedClient?.phone || newClientPhone || '').trim();

    if (!name) throw new Error('Pon el nombre de la clienta.');

    // Ya seleccionó una existente
    if (selectedClient?.id && isPro) {
      return { clientId: selectedClient.id, name, phone };
    }

    // No Pro
    if (!isPro || !user?.id) {
      return { clientId: null, name, phone };
    }

    const phoneNorm = normalizePhone(phone);

    // 🔁 OJO: esto requiere unique(user_id, phone_normalized) en clients
    if (phoneNorm) {
      const { data, error } = await supabase
        .from('clients')
        .upsert(
          { user_id: user.id, name, phone, phone_normalized: phoneNorm },
          { onConflict: 'user_id,phone_normalized' }
        )
        .select('id,name,phone,phone_normalized')
        .single();

      if (error) throw error;
      return { clientId: (data as any).id, name, phone };
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({ user_id: user.id, name, phone: null, phone_normalized: null })
      .select('id')
      .single();

    if (error) throw error;
    return { clientId: (data as any).id, name, phone };
  };

  const showCustomServiceInput = serviceOption === 'Otro (especificar)';

  const handleSave = async () => {
    try {
      const finalService =
        serviceOption === 'Otro (especificar)'
          ? customService.trim()
          : serviceOption;

      if (!finalService || !dateStr || !timeStr) {
        Alert.alert('Campos incompletos', 'Llena servicio, fecha y hora.');
        return;
      }

      const { clientId, name, phone } = await ensureClientPro();

      await addAppointment({
        clientId,
        clientName: name,
        phone,
        service: finalService,
        notes,
        date: dateStr,
        time: timeStr,
        module,
      });

      Alert.alert('Cita creada', 'La cita se agregó a tu agenda.');
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar la cita.');
    }
  };

  const onDateSelected = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDateStr(toLocalDateKey(selectedDate));
  };

  const onTimeSelected = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nueva cita</Text>

        {/* MÓDULO */}
        {hasMultipleModules ? (
          <View style={styles.moduleRow}>
            {enabledServices.includes('lashes') ? (
              <TouchableOpacity
                style={[styles.moduleBtn, module === 'lashes' && styles.moduleBtnActive]}
                onPress={() => setModule('lashes')}
              >
                <Text style={[styles.moduleBtnText, module === 'lashes' && styles.moduleBtnTextActive]}>
                  Pestañas
                </Text>
              </TouchableOpacity>
            ) : null}

            {enabledServices.includes('nails') ? (
              <TouchableOpacity
                style={[styles.moduleBtn, module === 'nails' && styles.moduleBtnActive]}
                onPress={() => setModule('nails')}
              >
                <Text style={[styles.moduleBtnText, module === 'nails' && styles.moduleBtnTextActive]}>
                  Uñas
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* CLIENTA */}
        <Text style={styles.label}>Clienta *</Text>
        <TextInput
          style={styles.input}
          value={clientQuery}
          onChangeText={(t) => {
            setClientQuery(t);
            setSelectedClient(null);
            setNewClientName(t);
          }}
          placeholder="Escribe para buscar… (Ana / 844…)"
        />

        {loadingClients ? <Text style={styles.hint}>Buscando…</Text> : null}

        {clientResults.length > 0 ? (
          <View style={styles.suggestBox}>
            {clientResults.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.suggestRow,
                  idx !== clientResults.length - 1 && styles.suggestRowBorder,
                ]}
                onPress={() => pickClient(item)}
              >
                <Text style={styles.suggestName}>{item.name}</Text>
                <Text style={styles.suggestPhone}>{item.phone ?? 'Sin teléfono'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {!selectedClient ? (
          <>
            <Text style={styles.label}>Teléfono (recomendado)</Text>
            <TextInput
              style={styles.input}
              value={newClientPhone}
              onChangeText={setNewClientPhone}
              placeholder="Ej. 8441234567"
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>
              Si pones teléfono, la app reconocerá automáticamente a la clienta la próxima vez.
            </Text>
          </>
        ) : null}

        {/* SERVICIO */}
        <SelectField
          label="Servicio *"
          value={serviceOption}
          onChange={setServiceOption}
          options={serviceOptions}
          placeholder={
            loadingServices
              ? 'Cargando servicios…'
              : module === 'nails'
              ? 'Selecciona un servicio de uñas'
              : 'Selecciona un servicio de pestañas'
          }
        />

        {showCustomServiceInput ? (
          <>
            <Text style={styles.label}>Especifica el servicio *</Text>
            <TextInput
              style={styles.input}
              value={customService}
              onChangeText={setCustomService}
              placeholder="Describe el servicio"
            />
          </>
        ) : null}

        {/* FECHA */}
        <Text style={styles.label}>Fecha *</Text>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.input}
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="2026-02-17"
          />
        ) : (
          <>
            <TouchableOpacity style={styles.selectorBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.selectorText}>{dateStr}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker mode="date" value={parseDateKey(dateStr)} onChange={onDateSelected} />
            )}
          </>
        )}

        {/* HORA */}
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
            <TouchableOpacity style={styles.selectorBtn} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.selectorText}>{timeStr}</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker mode="time" value={today} onChange={onTimeSelected} />
            )}
          </>
        )}

        {/* NOTAS */}
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
  container: { padding: 16, backgroundColor: Colors.screenBackground, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '500', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },

  moduleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  moduleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  moduleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  moduleBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  moduleBtnTextActive: { color: '#fff' },

  suggestBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginTop: 6,
    overflow: 'hidden',
  },
  suggestRow: { paddingVertical: 10, paddingHorizontal: 12 },
  suggestRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.primarySoft },
  suggestName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestPhone: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  selectorBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  selectorText: { fontSize: 15 },

  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});