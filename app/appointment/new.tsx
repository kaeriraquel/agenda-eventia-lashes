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
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { SelectField } from '../../components/SelectField';
import { useAppointments, ServiceModule } from '../../context/AppointmentsContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { normalizePhone } from '../../lib/phone';
import { useBrand } from '../../context/BrandContext';
import { toLocalDateKey, parseDateKey, formatLongDate, formatTime12 } from '../../lib/dates';
import { usePrices } from '../../context/PricesContext';
import { Colors, Radii, Shadow } from '../../constants/theme';
import { Button, money } from '../../components/ui';

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
  const params = useLocalSearchParams<{
    prefillDate?: string;
    prefillName?: string;
    prefillPhone?: string;
  }>();
  const { addAppointment, appointments } = useAppointments();
  const { items: priceItems } = usePrices();
  const { user } = useAuth();
  const isPro = !!user?.id;

  const { enabledServices } = useBrand();

  // ===== Módulo (lashes/nails) =====
  const defaultModule: ServiceModule =
    (enabledServices?.[0] as ServiceModule) ?? 'lashes';

  const [module, setModule] = useState<ServiceModule>(defaultModule);

  const hasMultipleModules = (enabledServices?.length ?? 0) > 1;

  useEffect(() => {
    // Si desactivan un módulo en Config, ajustamos
    if (!enabledServices || enabledServices.length === 0) return;
    if (!enabledServices.includes(module)) {
      setModule(enabledServices[0] as ServiceModule);
    }
  }, [enabledServices, module]);

  // Servicios de TU lista de precios (si tienes), si no, los de ejemplo
  const servicesFromPrices = useMemo(
    () =>
      priceItems.filter(
        i => i.category === 'servicio' && (i.module === module || i.module == null)
      ),
    [priceItems, module]
  );
  const SERVICE_OPTIONS = useMemo(() => {
    if (servicesFromPrices.length > 0) {
      return [...Array.from(new Set(servicesFromPrices.map(i => i.name))), 'Otro (especificar)'];
    }
    return module === 'nails' ? NAILS_OPTIONS : LASHES_OPTIONS;
  }, [module, servicesFromPrices]);

  // ===== Clienta: buscador + seleccion =====
  const [clientQuery, setClientQuery] = useState(String(params.prefillName ?? ''));
  const [clientResults, setClientResults] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);

  const [newClientName, setNewClientName] = useState(String(params.prefillName ?? ''));
  const [newClientPhone, setNewClientPhone] = useState(String(params.prefillPhone ?? ''));

  // ===== Form =====
  const [serviceOption, setServiceOption] = useState('');
  const [customService, setCustomService] = useState('');
  const [notes, setNotes] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [depositStr, setDepositStr] = useState('');

  const today = new Date();
  const isoDate = toLocalDateKey(today);

  const initialDate =
    typeof params.prefillDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.prefillDate)
      ? params.prefillDate
      : isoDate;
  const [dateStr, setDateStr] = useState(initialDate);
  const [timeStr, setTimeStr] = useState('10:00');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Al elegir servicio, sugiere su precio de tu lista
  useEffect(() => {
    const found = servicesFromPrices.find(i => i.name === serviceOption);
    if (found) setPriceStr(String(found.price));
  }, [serviceOption, servicesFromPrices]);

  // Limpia servicio cuando cambias módulo (para que no se quede uno inválido)
  useEffect(() => {
    setServiceOption('');
    setCustomService('');
  }, [module]);

  // ===== Buscar clientas mientras escribe (debounce) =====
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

  // ===== Crear/obtener clienta en PRO antes de crear cita =====
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

    // No Pro => no hay tabla clients
    if (!isPro || !user?.id) {
      return { clientId: null, name, phone };
    }

    const phoneNorm = normalizePhone(phone);

    // Con teléfono: upsert para evitar duplicados
    if (phoneNorm) {
      const { data, error } = await supabase
        .from('clients')
        .upsert(
          {
            user_id: user.id,
            name,
            phone,
            phone_normalized: phoneNorm,
          },
          { onConflict: 'user_id,phone_normalized' }
        )
        .select('id,name,phone,phone_normalized')
        .single();

      if (error) throw error;

      return { clientId: (data as any).id, name, phone };
    }

    // Sin teléfono: insert normal
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

      if (!(selectedClient?.name || newClientName || clientQuery).trim()) {
        Alert.alert('Falta la clienta', 'Escribe el nombre de la clienta.');
        return;
      }
      if (!finalService || !dateStr || !timeStr) {
        Alert.alert('Campos incompletos', 'Llena servicio, fecha y hora.');
        return;
      }

      const toNum = (t: string) => {
        const c = t.replace(/[$,\s]/g, '');
        if (!c) return null;
        const n = Number(c);
        return isNaN(n) ? NaN : n;
      };
      const price = toNum(priceStr);
      const deposit = toNum(depositStr);
      if (Number.isNaN(price) || Number.isNaN(deposit)) {
        Alert.alert('Revisa los montos', 'Escribe solo números en precio y anticipo.');
        return;
      }
      if (deposit != null && price != null && deposit > price) {
        Alert.alert('Anticipo mayor al precio', 'El anticipo no puede ser mayor que el precio.');
        return;
      }

      // ¿Ya hay otra cita a esa misma hora?
      const clash = appointments.find(
        a => a.date === dateStr && a.time === timeStr && a.status === 'pendiente'
      );
      if (clash) {
        const goOn = await new Promise<boolean>(resolve =>
          Alert.alert(
            'Horario ocupado',
            `Ya tienes a ${clash.clientName} a las ${formatTime12(timeStr)}. ¿Agendar de todos modos?`,
            [
              { text: 'Cambiar hora', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Agendar igual', onPress: () => resolve(true) },
            ]
          )
        );
        if (!goOn) return;
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
        module, // ✅ aquí ya se guarda lashes/nails
        price,
        deposit,
      });

      Alert.alert('Cita creada', `${name} · ${formatLongDate(dateStr)} a las ${formatTime12(timeStr)}`);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
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

        {/* ✅ MÓDULO */}
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

        {/* ===== CLIENTA ===== */}
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

        {/* ===== SERVICIO ===== */}
        <SelectField
          label="Servicio *"
          value={serviceOption}
          onChange={setServiceOption}
          options={SERVICE_OPTIONS}
          placeholder={module === 'nails' ? 'Selecciona un servicio de uñas' : 'Selecciona un servicio de pestañas'}
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

        {/* ===== PRECIO Y ANTICIPO ===== */}
        <View style={styles.twoCols}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Precio</Text>
            <TextInput
              style={styles.input}
              value={priceStr}
              onChangeText={setPriceStr}
              placeholder="$0"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Anticipo recibido</Text>
            <TextInput
              style={styles.input}
              value={depositStr}
              onChangeText={setDepositStr}
              placeholder="$0"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        {priceStr && depositStr ? (
          <Text style={styles.hint}>
            Le faltará pagar {money(Math.max(0, Number(priceStr) - Number(depositStr) || 0))} el día de la cita.
          </Text>
        ) : null}

        {/* ===== FECHA ===== */}
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
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.selectorText}>
                {formatLongDate(dateStr).replace(/^./, c => c.toUpperCase())}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker mode="date" value={parseDateKey(dateStr)} onChange={onDateSelected} />
            )}
          </>
        )}

        {/* ===== HORA ===== */}
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
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.selectorText}>{formatTime12(timeStr)}</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                mode="time"
                value={(() => {
                  const [h, m] = timeStr.split(':').map(Number);
                  const d = new Date();
                  d.setHours(h || 10, m || 0, 0, 0);
                  return d;
                })()}
                onChange={onTimeSelected}
              />
            )}
          </>
        )}

        {/* ===== NOTAS ===== */}
        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Sensibilidad, recomendaciones, etc."
          multiline
        />

        <Button title="Guardar cita" icon="checkmark" onPress={handleSave} style={{ marginTop: 24 }} />

        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 4, backgroundColor: Colors.screenBackground, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5, marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  twoCols: { flexDirection: 'row', gap: 12 },

  moduleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radii.pill,
    padding: 3,
    marginBottom: 4,
  },
  moduleBtn: { flex: 1, borderRadius: Radii.pill, paddingVertical: 9, alignItems: 'center' },
  moduleBtnActive: { backgroundColor: Colors.cardBackground, ...Shadow.card },
  moduleBtnText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  moduleBtnTextActive: { color: Colors.primary },

  suggestBox: {
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardBackground,
    marginTop: 6,
    overflow: 'hidden',
    ...Shadow.card,
  },
  suggestRow: { paddingVertical: 12, paddingHorizontal: 14 },
  suggestRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSoft },
  suggestName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  suggestPhone: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: Colors.cardBackground,
  },
  selectorText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
});
