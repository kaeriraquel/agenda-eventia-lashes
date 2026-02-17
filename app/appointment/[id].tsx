// app/appointment/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking, 
} from 'react-native';
import { MappingCanvas } from '../../components/MappingCanvas';

import { useLocalSearchParams } from 'expo-router';
import { useAppointments } from '../../context/AppointmentsContext';
import type { AppointmentStatus } from '../../context/AppointmentsContext';
import { SelectField } from '../../components/SelectField';

const APPLICATION_OPTIONS = ['Clásica', 'Híbrida', 'Volumen', 'Mega volumen'];
const EYE_SHAPE_OPTIONS = ['Almendra', 'Redondo', 'Caído', 'Encapsulado', 'Profundo'];
const CURL_OPTIONS = ['J', 'B', 'C', 'CC', 'D', 'L'];
const THICKNESS_OPTIONS = ['0.07', '0.10', '0.12', '0.15', '0.20'];
const DESIGN_OPTIONS = ['Natural', 'Doll eye', 'Fox', 'Cat eye', 'Squirrel'];
const ADHESIVE_OPTIONS = [
  'Adhesivo rápido',
  'Adhesivo sensibilidad',
  'Adhesivo principiante',
  'Otro',
];

const SERVICE_OPTIONS = [
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

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appointments, updateAppointment } = useAppointments();

  const appointment = appointments.find(a => a.id === id);

  // --- MODO EDICIÓN ---
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [isEditingTechnical, setIsEditingTechnical] = useState(false);

  // --- ESTADOS PARA EDITAR DATOS GENERALES DE LA CITA ---
  const [phone, setPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [serviceOption, setServiceOption] = useState('');
  const [customService, setCustomService] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [priceStr, setPriceStr] = useState(''); // precio texto

  // --- ESTADOS FICHA TÉCNICA ---
  const [applicationType, setApplicationType] = useState('');
  const [eyeShape, setEyeShape] = useState('');
  const [curl, setCurl] = useState('');
  const [lengths, setLengths] = useState('');
  const [thickness, setThickness] = useState('');
  const [design, setDesign] = useState('');
  const [adhesive, setAdhesive] = useState('');
  const [customAdhesive, setCustomAdhesive] = useState('');
  const [techNotes, setTechNotes] = useState('');

  // Helper para resetear ficha técnica desde la cita
  const resetTechnicalFromAppointment = () => {
    if (!appointment) return;

    if (appointment.technicalSheet) {
      const t = appointment.technicalSheet;
      setApplicationType(t.applicationType || '');
      setEyeShape(t.eyeShape || '');
      setCurl(t.curl || '');
      setLengths(t.lengths || '');
      setThickness(t.thickness || '');
      setDesign(t.design || '');
      setAdhesive(t.adhesive || '');
      setTechNotes(t.notes || '');
    } else {
      setApplicationType('');
      setEyeShape('');
      setCurl('');
      setLengths('');
      setThickness('');
      setDesign('');
      setAdhesive('');
      setTechNotes('');
    }
    setCustomAdhesive('');
  };

  useEffect(() => {
    if (!appointment) return;

    // Datos generales
    setClientName(appointment.clientName);
    setDateStr(appointment.date);
    setTimeStr(appointment.time);
    setGeneralNotes(appointment.notes ?? '');
    setPhone(appointment.phone ?? '');


    if (appointment.price != null) {
      setPriceStr(appointment.price.toString());
    } else {
      setPriceStr('');
    }

    // Servicio → si no está en la lista, lo tratamos como "Otro"
    if (SERVICE_OPTIONS.includes(appointment.service)) {
      setServiceOption(appointment.service);
      setCustomService('');
    } else {
      setServiceOption('Otro (especificar)');
      setCustomService(appointment.service);
    }

    // Mantén esto para sincronizar ficha técnica con lo guardado
    resetTechnicalFromAppointment();

    // ❌ NO hagas esto aquí, porque te saca del modo edición al dibujar
    //setIsEditingGeneral(false);
    //setIsEditingTechnical(false);
  }, [appointment]);

  if (!appointment) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No se encontró la cita.</Text>
      </View>
    );
  }

  const showCustomService = serviceOption === 'Otro (especificar)';
  const showCustomAdhesive = adhesive === 'Otro';

  const handleSaveGeneral = () => {
    const finalService =
      serviceOption === 'Otro (especificar)' ? customService : serviceOption;

    if (!clientName.trim() || !finalService.trim() || !dateStr.trim() || !timeStr.trim()) {
      Alert.alert('Campos incompletos', 'Llena nombre, servicio, fecha y hora.');
      return;
    }

    let priceNumber: number | null = null;
    if (priceStr.trim() !== '') {
      const parsed = Number(priceStr.replace(',', '.'));
      if (isNaN(parsed)) {
        Alert.alert('Precio inválido', 'Escribe un número válido para el precio.');
        return;
      }
      priceNumber = parsed;
    }

    updateAppointment(appointment.id, {
    clientName: clientName.trim(),
    phone: phone.trim(),
    service: finalService.trim(),
    date: dateStr.trim(),
    time: timeStr.trim(),
    notes: generalNotes.trim(),
    price: priceNumber,
    });

    Alert.alert('Cita actualizada', 'Los datos de la cita se guardaron.');
    setIsEditingGeneral(false);
  };

  const handleCancelEditGeneral = () => {
    if (!appointment) return;
    setClientName(appointment.clientName);
    setDateStr(appointment.date);
    setTimeStr(appointment.time);
    setGeneralNotes(appointment.notes ?? '');
    if (appointment.price != null) {
      setPriceStr(appointment.price.toString());
    } else {
      setPriceStr('');
    }

    if (SERVICE_OPTIONS.includes(appointment.service)) {
      setServiceOption(appointment.service);
      setCustomService('');
    } else {
      setServiceOption('Otro (especificar)');
      setCustomService(appointment.service);
    }

    setIsEditingGeneral(false);
  };

  const saveTechnicalSheet = () => {
    const finalAdhesive =
      adhesive === 'Adhesivo rápido' ||
      adhesive === 'Adhesivo sensibilidad' ||
      adhesive === 'Adhesivo principiante'
        ? adhesive
        : customAdhesive || adhesive;

    updateAppointment(appointment.id, {
      technicalSheet: {
        applicationType,
        eyeShape,
        curl,
        lengths,
        thickness,
        design,
        adhesive: finalAdhesive,
        notes: techNotes,
      },
    });

    Alert.alert('Ficha técnica', 'La ficha técnica se guardó correctamente.');
    setIsEditingTechnical(false);
  };

  const handleCancelTechnical = () => {
    resetTechnicalFromAppointment();
    setIsEditingTechnical(false);
  };

  const changeStatus = (newStatus: AppointmentStatus) => {
    Alert.alert(
      'Cambiar estado',
      `¿Seguro que quieres marcar esta cita como "${newStatus}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => {
            updateAppointment(appointment.id, { status: newStatus });
            Alert.alert('Estado actualizado', `La cita ahora está: ${newStatus}.`);
          },
        },
      ]
    );
  };
  // Funciones para llamar o abrir WhatsApp
    const handleCall = () => {
    if (!phone || phone.trim() === '') {
      Alert.alert('Sin teléfono', 'Esta cita no tiene número de teléfono guardado.');
      return;
    }
    Linking.openURL(`tel:${phone.trim()}`);
  };

  const handleWhatsApp = () => {
    if (!phone || phone.trim() === '') {
      Alert.alert('Sin teléfono', 'Esta cita no tiene número de teléfono guardado.');
      return;
    }
    const clean = phone.replace(/\D/g, '');
    const url = `https://wa.me/${clean}`;
    Linking.openURL(url);
  };


  // Helpers para mostrar valores en modo lectura
  const displayOrDash = (v?: string | null) =>
    v && v.trim() !== '' ? v : '—';

  const displayService = () => {
    if (showCustomService) return displayOrDash(customService || appointment.service);
    return displayOrDash(serviceOption || appointment.service);
  };

  const displayPrice = () => {
    if (priceStr.trim() !== '') {
      const parsed = Number(priceStr.replace(',', '.'));
      if (!isNaN(parsed)) return `$${parsed.toFixed(2)} MXN`;
    }
    if (appointment.price != null) return `$${appointment.price.toFixed(2)} MXN`;
    return '—';
  };

  // Badge de estado
  const statusColors: Record<AppointmentStatus, { bg: string; text: string }> = {
    realizada: { bg: '#E6F9E6', text: '#2C8A2C' },
    pendiente: { bg: '#FFF3E0', text: '#E69100' },
    cancelada: { bg: '#FFE5E5', text: '#D12C2C' },
    no_asistio: { bg: '#EFE5FF', text: '#6A42C8' },
  };

  const statusStyle = statusColors[appointment.status];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* ENCABEZADO */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{appointment.clientName}</Text>
            <Text style={styles.subtitleSmall}>
              {appointment.date} · {appointment.time}
            </Text>
          </View>
          
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {appointment.status}
            </Text>
          </View>
        </View>
        

        {/* DATOS GENERALES */}
        <View style={styles.sectionCard}>
          <View className="sectionHeaderRow" style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Datos de la cita</Text>
            {!isEditingGeneral ? (
              <TouchableOpacity
                style={styles.editChip}
                onPress={() => setIsEditingGeneral(true)}
              >
                <Text style={styles.editChipText}>Editar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {!isEditingGeneral ? (
            // ---- MODO LECTURA ----
            <View>
              <Text style={styles.label}>Nombre de la clienta</Text>
              <Text style={styles.value}>{displayOrDash(clientName)}</Text>

              <Text style={styles.label}>Fecha</Text>
              <Text style={styles.value}>{displayOrDash(dateStr)}</Text>

              <Text style={styles.label}>Hora</Text>
              <Text style={styles.value}>{displayOrDash(timeStr)}</Text>

              <Text style={styles.label}>Servicio</Text>
              <Text style={styles.value}>{displayService()}</Text>

              <Text style={styles.label}>Notas de la cita</Text>
              <Text style={styles.value}>
                {generalNotes.trim() !== '' ? generalNotes : '—'}
              </Text>

              <Text style={styles.label}>Precio</Text>
              <Text style={styles.value}>{displayPrice()}</Text>
              <Text style={styles.label}>Teléfono</Text>
              <Text style={styles.value}>{displayOrDash(phone)}</Text>

            </View>
          ) : (
            // ---- MODO EDICIÓN ----
            <View>
              <Text style={styles.label}>Nombre de la clienta</Text>
              <TextInput
                style={styles.input}
                value={clientName}
                onChangeText={setClientName}
                placeholder="Nombre"
              />

              <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="2025-11-25"
              />

              <Text style={styles.label}>Hora (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={timeStr}
                onChangeText={setTimeStr}
                placeholder="15:30"
              />

              <SelectField
                label="Servicio"
                value={serviceOption}
                onChange={setServiceOption}
                options={SERVICE_OPTIONS}
                placeholder="Selecciona un servicio"
              />

              {showCustomService && (
                <>
                  <Text style={styles.label}>Especifica el servicio</Text>
                  <TextInput
                    style={styles.input}
                    value={customService}
                    onChangeText={setCustomService}
                    placeholder="Servicio personalizado"
                  />
                </>
              )}

              <Text style={styles.label}>Notas de la cita</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={generalNotes}
                onChangeText={setGeneralNotes}
                placeholder="Notas generales (no técnicas)..."
                multiline
              />

              <Text style={styles.label}>Precio de esta cita (MXN)</Text>
              <TextInput
                style={styles.input}
                value={priceStr}
                onChangeText={setPriceStr}
                placeholder="Ej. 450"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Número de teléfono</Text>
                <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ej. 8441234567"
                keyboardType="phone-pad"
                />

              <TouchableOpacity style={styles.button} onPress={handleSaveGeneral}>
                <Text style={styles.buttonText}>Guardar cambios de la cita</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonOutline}
                onPress={handleCancelEditGeneral}
              >
                <Text style={styles.buttonOutlineText}>Cancelar edición</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* CAMBIAR ESTADO */}
        <Text style={styles.sectionTitle}>Cambiar estado</Text>

        <View style={styles.statusButtonsRow}>
          <TouchableOpacity
            style={[styles.statusButton, styles.done]}
            onPress={() => changeStatus('realizada')}
          >
            <Text style={styles.statusButtonText}>Realizada</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusButton, styles.pending]}
            onPress={() => changeStatus('pendiente')}
          >
            <Text style={styles.statusButtonText}>Pendiente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusButton, styles.cancelled]}
            onPress={() => changeStatus('cancelada')}
          >
            <Text style={styles.statusButtonText}>Cancelada</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusButtonsRow}>
          <TouchableOpacity
            style={[styles.statusButton, styles.noShow]}
            onPress={() => changeStatus('no_asistio')}
          >
            <Text style={styles.statusButtonText}>No asistió</Text>
          </TouchableOpacity>
        </View>

        {/* FICHA TÉCNICA (LECTURA + BOTÓN EDITAR) */}
        <View style={styles.sectionDivider} />

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ficha técnica</Text>
            {!isEditingTechnical ? (
              <TouchableOpacity
                style={styles.editChip}
                onPress={() => setIsEditingTechnical(true)}
              >
                <Text style={styles.editChipText}>Editar ficha</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {!isEditingTechnical ? (
            // ---- MODO LECTURA FICHA ----
            <View>
              <Text style={styles.label}>Tipo de aplicación</Text>
              <Text style={styles.value}>{displayOrDash(applicationType)}</Text>

              <Text style={styles.label}>Tipo de ojo</Text>
              <Text style={styles.value}>{displayOrDash(eyeShape)}</Text>

              <Text style={styles.label}>Curva</Text>
              <Text style={styles.value}>{displayOrDash(curl)}</Text>

              <Text style={styles.label}>Longitudes</Text>
              <Text style={styles.value}>{displayOrDash(lengths)}</Text>

              <Text style={styles.label}>Grosor</Text>
              <Text style={styles.value}>{displayOrDash(thickness)}</Text>

              <Text style={styles.label}>Diseño / Mapping</Text>
              <Text style={styles.value}>{displayOrDash(design)}</Text>

              <Text style={styles.label}>Adhesivo</Text>
              <Text style={styles.value}>{displayOrDash(adhesive)}</Text>

              <Text style={styles.label}>Notas técnicas</Text>
              <Text style={styles.value}>
                {techNotes.trim() !== '' ? techNotes : '—'}
              </Text>
            </View>
          ) : (
            // ---- MODO EDICIÓN FICHA ----
            <View>
              <SelectField
                label="Tipo de aplicación"
                value={applicationType}
                onChange={setApplicationType}
                options={APPLICATION_OPTIONS}
                placeholder="Clásica, Híbrida, Volumen..."
              />

              <SelectField
                label="Tipo de ojo"
                value={eyeShape}
                onChange={setEyeShape}
                options={EYE_SHAPE_OPTIONS}
                placeholder="Almendra, redondo, caído..."
              />

              <SelectField
                label="Curva"
                value={curl}
                onChange={setCurl}
                options={CURL_OPTIONS}
                placeholder="C, CC, D..."
              />

              <Text style={styles.label}>Longitudes</Text>
              <TextInput
                style={styles.input}
                value={lengths}
                onChangeText={setLengths}
                placeholder="Ej. 9-10-11-12"
              />

              <SelectField
                label="Grosor"
                value={thickness}
                onChange={setThickness}
                options={THICKNESS_OPTIONS}
                placeholder="0.07, 0.10, 0.15..."
              />

              <SelectField
                label="Diseño / Mapping"
                value={design}
                onChange={setDesign}
                options={DESIGN_OPTIONS}
                placeholder="Natural, Doll eye, Fox..."
              />

              <SelectField
                label="Adhesivo"
                value={adhesive}
                onChange={setAdhesive}
                options={ADHESIVE_OPTIONS}
                placeholder="Selecciona adhesivo"
              />

              {showCustomAdhesive && (
                <>
                  <Text style={styles.label}>Especifica el adhesivo</Text>
                  <TextInput
                    style={styles.input}
                    value={customAdhesive}
                    onChangeText={setCustomAdhesive}
                    placeholder="Marca, tiempo de secado, etc."
                  />
                </>
              )}

              <Text style={styles.label}>Notas técnicas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={techNotes}
                onChangeText={setTechNotes}
                placeholder="Retención, sensibilidades, recomendaciones..."
                multiline
              />

               <Text style={styles.sectionTitle}>Mapping</Text>

              <Text style={styles.labelSmall}>Ojo izquierdo</Text>
              <MappingCanvas
                baseImage={require('../../assets/mapping-left.png')}
                initialData={appointment.mappingLeft ?? null}
                onChange={data =>
                  updateAppointment(appointment.id, { mappingLeft: data })
                }
                strokeColor="#333333"
                strokeWidth={2}
              />

              <Text style={[styles.labelSmall, { marginTop: 12 }]}>
                Ojo derecho
              </Text>
              <MappingCanvas
                baseImage={require('../../assets/mapping-right.png')}
                initialData={appointment.mappingRight ?? null}
                onChange={data =>
                  updateAppointment(appointment.id, { mappingRight: data })
                }
                strokeColor="#333333"
                strokeWidth={2}
              />

              <TouchableOpacity style={styles.button} onPress={saveTechnicalSheet}>
                <Text style={styles.buttonText}>Guardar ficha técnica</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonOutline}
                onPress={handleCancelTechnical}
              >
                <Text style={styles.buttonOutlineText}>Cancelar edición</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
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
  errorText: {
    marginTop: 20,
    textAlign: 'center',
    color: 'red',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  subtitleSmall: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#777',
    marginBottom: 8,
  },
  editChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFB3CF',
  },
  editChipText: {
    fontSize: 12,
    color: '#FF6FB5',
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    color: '#444',
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
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
  button: {
    backgroundColor: '#FF6FB5',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#FF6FB5',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonOutlineText: {
    color: '#FF6FB5',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#FFD1E8',
    marginVertical: 24,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  done: {
    backgroundColor: '#6FD66F', // verde
  },
  pending: {
    backgroundColor: '#FFB347', // naranja
  },
  cancelled: {
    backgroundColor: '#FF6B6B', // rojo
  },
  noShow: {
    backgroundColor: '#A785FF', // morado
  },
  labelSmall: {
    fontSize: 12,
    color: '#555555',
    marginTop: 4,
    marginBottom: 4,
  },
});
