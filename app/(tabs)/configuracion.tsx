// app/(tabs)/configuracion.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../context/AppointmentsContext';
import { useClients } from '../../context/ClientsContext';

import { supabase } from '../../lib/supabase';
import { normalizePhone } from '../../lib/phone';

type ServiceModule = 'lashes' | 'nails';

export default function ConfiguracionScreen() {
  const router = useRouter();

  const {
    brandName,
    logoUri,
    setBrandName,
    setLogoUri,
    resetBrand,
    enabledServices,
    toggleService,
  } = useBrand();

  const { user, loading } = useAuth();
  const { refreshAppointments } = useAppointments();
  const { refreshClients } = useClients();

  const [tempName, setTempName] = useState(brandName);
  const [savingName, setSavingName] = useState(false);
  const [changingLogo, setChangingLogo] = useState(false);
  const [importing, setImporting] = useState(false);

  const STORAGE_KEY = 'agenda_eventia_appointments_v1';

  const serviceOptions = [
    { key: 'lashes' as const, label: 'Pestañas' },
    { key: 'nails' as const, label: 'Uñas' },
  ];

  const handleSaveName = () => {
    setSavingName(true);
    setBrandName(tempName.trim() || 'Mi marca');
    setSavingName(false);
    Alert.alert('Guardado', 'Nombre del negocio actualizado.');
  };

  const handlePickLogo = async () => {
    try {
      setChangingLogo(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesito acceso a tu galería para elegir un logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      setLogoUri(uri);
      Alert.alert('Logo actualizado', 'El nuevo logo se ha guardado.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Ocurrió un error al elegir la imagen.');
    } finally {
      setChangingLogo(false);
    }
  };

  const handleReset = () => {
    resetBrand();
    setTempName('Beauty Lashes RG');
    Alert.alert('Restablecido', 'Se restauró la marca por defecto.');
  };

  /**
   * ✅ Asegura clienta en la tabla clients SIN upsert (evita el error 42P10).
   * Reglas:
   * - Si hay phone_normalized -> buscar por (user_id + phone_normalized)
   *   - si existe -> update name/phone
   *   - si no -> insert
   * - Si NO hay phone_normalized -> insert (puede duplicar por nombre; es esperado)
   */
  const ensureClientId = async (params: {
    userId: string;
    name: string;
    phoneRaw: string;
  }): Promise<string | null> => {
    const name = (params.name || '').trim();
    const phone = (params.phoneRaw || '').trim();

    if (!name) return null;

    const phoneNorm = normalizePhone(phone);

    try {
      if (phoneNorm) {
        // 1) buscar
        const { data: found, error: findErr } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', params.userId)
          .eq('phone_normalized', phoneNorm)
          .maybeSingle();

        if (findErr) throw findErr;

        if (found?.id) {
          // 2) actualizar por si cambió el nombre o el phone formateado
          const { error: updErr } = await supabase
            .from('clients')
            .update({
              name,
              phone: phone || null,
              // mantén phone_normalized
            })
            .eq('id', found.id)
            .eq('user_id', params.userId);

          if (updErr) throw updErr;
          return String(found.id);
        }

        // 3) insertar si no existe
        const { data: inserted, error: insErr } = await supabase
          .from('clients')
          .insert({
            user_id: params.userId,
            name,
            phone: phone || null,
            phone_normalized: phoneNorm,
          })
          .select('id')
          .single();

        if (insErr) throw insErr;
        return String((inserted as any).id);
      }

      // Sin teléfono normalizable -> insert
      const { data: inserted, error: insErr } = await supabase
        .from('clients')
        .insert({
          user_id: params.userId,
          name,
          phone: phone || null,
          phone_normalized: null,
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      return String((inserted as any).id);
    } catch (err: any) {
      console.error('ensureClientId error:', err);
      return null;
    }
  };

  /**
   * IMPORTADOR:
   * - Sube citas locales -> nube (appointments)
   * - Crea/actualiza clientas en clients
   * - Liga appointments.client_id
   */
  const handleImportLocalToCloud = async () => {
    if (!user?.id) return;
    if (importing) return;

    Alert.alert(
      'Importar citas',
      'Esto subirá a tu cuenta Pro las citas guardadas en este dispositivo y registrará tus clientas. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, importar',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              const stored = await AsyncStorage.getItem(STORAGE_KEY);
              const localAppointments = stored ? JSON.parse(stored) : [];

              if (!Array.isArray(localAppointments) || localAppointments.length === 0) {
                Alert.alert('Sin citas', 'No encontré citas locales para importar.');
                return;
              }

              const notImported = localAppointments.filter((a: any) => !a.importedToCloud);

              if (notImported.length === 0) {
                Alert.alert('Nada nuevo', 'Ya importaste todas tus citas locales.');
                return;
              }

              // 1) crear/asegurar clientas y mapear localId -> clientId
              const localIdToClientId = new Map<string, string | null>();

              for (const a of notImported) {
                const localId = String(a.id);
                const name = String(a.clientName ?? '').trim();
                const phone = String(a.phone ?? '').trim();

                const clientId = await ensureClientId({
                  userId: user.id,
                  name,
                  phoneRaw: phone,
                });

                localIdToClientId.set(localId, clientId);
              }

              // 2) construir filas para appointments
              const rows = notImported.map((a: any) => {
                const localId = String(a.id);

                const rawModule = String(a.module ?? 'lashes') as ServiceModule;
                const module: ServiceModule = rawModule === 'nails' ? 'nails' : 'lashes';

                return {
                  user_id: user.id,
                  source_local_id: localId, // 👈 unique (user_id, source_local_id)
                  client_id: localIdToClientId.get(localId) ?? null, // 👈 link

                  module,

                  client_name: a.clientName ?? '',
                  phone: a.phone ?? null,
                  service_name: a.service ?? '',
                  date: a.date ?? '',
                  time: a.time ?? '',
                  notes: a.notes ?? null,
                  price: a.price ?? null,
                  status: a.status ?? 'pendiente',
                  technical_sheet: a.technicalSheet ?? null,
                  mapping_left: a.mappingLeft ?? null,
                  mapping_right: a.mappingRight ?? null,
                };
              });

              // 3) upsert a appointments (esto sí está bien en tu schema)
              const { error: upsertApptErr } = await supabase
                .from('appointments')
                .upsert(rows, { onConflict: 'user_id,source_local_id' });

              if (upsertApptErr) {
                console.error(upsertApptErr);
                Alert.alert('Error importando', upsertApptErr.message);
                return;
              }

              // 4) marcar importadas localmente
              const updatedLocal = localAppointments.map((a: any) =>
                notImported.some((b: any) => String(b.id) === String(a.id))
                  ? { ...a, importedToCloud: true }
                  : a
              );

              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal));

              // 5) refrescar listas
              await refreshAppointments();
              await refreshClients();

              Alert.alert('Listo', `Se importaron ${notImported.length} citas y se registraron tus clientas.`);
            } catch (e: any) {
              console.error(e);
              Alert.alert('Error', e?.message ?? 'No se pudo importar.');
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Configurar mi marca</Text>
      <Text style={styles.subtitle}>
        Personaliza el nombre, logo y servicios. En Pro puedes sincronizar tus citas.
      </Text>

      {/* PRO */}
      <View style={styles.proCard}>
        <Text style={styles.sectionTitle}>Versión Pro</Text>
        <Text style={styles.proSubtitle}>
          {loading
            ? 'Cargando sesión...'
            : user
              ? 'Plan Pro activo: sincronización entre dispositivos.'
              : 'Gratis: tus datos se guardan solo en este dispositivo.'}
        </Text>

        {!loading && user ? (
          <TouchableOpacity
            style={[styles.buttonOutline, importing && { opacity: 0.6 }]}
            onPress={handleImportLocalToCloud}
            disabled={importing}
          >
            {importing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator />
                <Text style={styles.buttonOutlineText}>Importando…</Text>
              </View>
            ) : (
              <Text style={styles.buttonOutlineText}>☁️ Importar mis citas locales a Pro</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {!loading && !user ? (
          <TouchableOpacity style={styles.proButton} onPress={() => router.push('/auth')}>
            <Text style={styles.proButtonText}>✨ Iniciar sesión / Crear cuenta</Text>
          </TouchableOpacity>
        ) : null}

        {!loading && user ? (
          <TouchableOpacity
            style={styles.proButtonOutline}
            onPress={async () => {
              await supabase.auth.signOut();
              Alert.alert('Sesión cerrada', 'Volviste a modo Gratis.');
            }}
          >
            <Text style={styles.proButtonOutlineText}>Cerrar sesión</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* SERVICIOS */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Servicios que ofreces</Text>
        <Text style={styles.subtitleSmall}>
          Selecciona uno o varios (esto ajustará formularios y listas).
        </Text>

        {serviceOptions.map(opt => {
          const active = enabledServices.includes(opt.key);
          return (
            <Pressable
              key={opt.key}
              onPress={() => toggleService(opt.key)}
              style={[styles.serviceRow, active && styles.serviceRowActive]}
            >
              <Text style={[styles.serviceCheck, active && styles.serviceCheckActive]}>
                {active ? '☑' : '☐'}
              </Text>
              <Text style={styles.serviceLabel}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* LOGO */}
      <View style={styles.logoPreviewCard}>
        <Text style={styles.sectionTitle}>Vista previa del logo</Text>

        <View style={styles.logoWrapper}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
          ) : (
            <Image
              source={require('../../assets/images/beauty-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.buttonOutline}
          onPress={handlePickLogo}
          disabled={changingLogo}
        >
          <Text style={styles.buttonOutlineText}>
            {changingLogo ? 'Abriendo galería...' : 'Cambiar logo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={handleReset}>
          <Text style={styles.linkButtonText}>Restablecer logo y nombre por defecto</Text>
        </TouchableOpacity>
      </View>

      {/* NOMBRE */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Nombre del negocio</Text>
        <Text style={styles.label}>Cómo quieres que aparezca en el Home</Text>
        <TextInput
          style={styles.input}
          value={tempName}
          onChangeText={setTempName}
          placeholder="Ej. Beauty Lashes RG"
        />

        <TouchableOpacity
          style={styles.mainButton}
          onPress={handleSaveName}
          disabled={savingName}
        >
          <Text style={styles.mainButtonText}>
            {savingName ? 'Guardando...' : 'Guardar nombre'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFF7FC',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitleSmall: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    marginBottom: 10,
  },
  proCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  proSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 6,
  },
  proButton: {
    backgroundColor: '#FF6FB5',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 12,
  },
  proButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  proButtonOutline: {
    borderWidth: 1,
    borderColor: '#FF6FB5',
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 12,
  },
  proButtonOutlineText: {
    color: '#FF6FB5',
    fontSize: 14,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    color: '#444',
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
  mainButton: {
    backgroundColor: '#FF6FB5',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 14,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#FF6FB5',
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonOutlineText: {
    color: '#FF6FB5',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 6,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 12,
    color: '#777',
    textDecorationLine: 'underline',
  },
  logoPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  logoWrapper: {
    width: '100%',
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  logo: {
    width: '80%',
    height: '100%',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD1E8',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  serviceRowActive: {
    borderColor: '#FF6FB5',
    backgroundColor: '#FFE1F0',
  },
  serviceCheck: {
    width: 26,
    fontSize: 16,
    color: '#777',
  },
  serviceCheckActive: {
    color: '#FF6FB5',
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
