// app/(tabs)/index.tsx
import React from 'react';
import { Colors } from '../../constants/theme';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppointments } from '../../context/AppointmentsContext';
import { useBrand } from '../../context/BrandContext';

export default function HomeScreen() {
  const router = useRouter();
  const { appointments, getAppointmentsByDate } = useAppointments();
  const { brandName, logoUri } = useBrand();

  const today = new Date().toISOString().slice(0, 10);
  const todaysAppointments = getAppointmentsByDate(today);
  const totalAppointments = appointments.length;

  const totalRevenue = appointments
    .filter(a => a.status === 'realizada' && a.price != null)
    .reduce((sum, a) => sum + (a.price ?? 0), 0);

  const handleGoToToday = () => {
    router.push('/(tabs)/agenda');
  };

  const handleNewAppointment = () => {
    router.push('/appointment/new');
  };

  const handleGoToPrices = () => {
    router.push('/(tabs)/precios');
  };

  const handleGoToConfig = () => {
    router.push('/(tabs)/configuracion');
  };

  return (
    <View style={styles.container}>
      {/* LOGO PRINCIPAL DEL ESTUDIO (Beauty por defecto, pero editable) */}
      <View style={styles.logoContainer}>
        {logoUri ? (
          <Image
            source={{ uri: logoUri }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <Image
            // 👇 Asegúrate de guardar aquí tu logo de Beauty
            // por ejemplo: assets/images/beauty-logo.png
            source={require('../../assets/images/beauty-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
      </View>

      <Text style={styles.title}>{brandName}</Text>
      <Text style={styles.subtitle}>
        Tu agenda para extensiones, lifting y ceja.
      </Text>

      <Text style={styles.powered}>
        hecho con cariño por Eventia SLW
      </Text>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{todaysAppointments.length}</Text>
          <Text style={styles.cardLabel}>Citas para hoy</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{totalAppointments}</Text>
          <Text style={styles.cardLabel}>Citas totales</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.fullWidthCard]}>
          <Text style={styles.cardLabel}>Total recaudado (realizadas)</Text>
          <Text style={[styles.cardNumber, styles.moneyText]}>
            ${totalRevenue.toFixed(2)} MXN
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.mainButton} onPress={handleGoToToday}>
        <Text style={styles.mainButtonText}>Ver agenda</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mainButton, styles.configButton]}
        onPress={handleNewAppointment}
      >
        <Text style={styles.configButtonText}>Agregar nueva cita</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mainButton, styles.configButton]}
        onPress={handleGoToPrices}
      >
        <Text style={styles.configButtonText}>Ver lista de precios</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mainButton, styles.configButton]}
        onPress={handleGoToConfig}
      >
        <Text style={styles.configButtonText}>Configurar mi marca</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.screenBackground,
    alignItems: 'center',
  },
  logoContainer: {
    marginTop: 40,
    marginBottom: 12,
    width: 180,
    height: 80,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  powered: {
    fontSize: 11,
    color: Colors.textSubtle,
    marginTop: 4,
    marginBottom: 20,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidthCard: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  moneyText: {
    fontSize: 22,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  mainButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 12,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 12,
  },
  tertiaryButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  configButton: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 12,
  },
  configButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
