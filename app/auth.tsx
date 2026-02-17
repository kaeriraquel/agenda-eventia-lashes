// app/auth.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';

export default function AuthScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const e = email.trim();
    if (!e || password.length < 6) {
      Alert.alert('Datos inválidos', 'Email válido y contraseña mínimo 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // A veces Supabase pide confirmar email (depende de tu configuración)
      if (!data.session) {
        Alert.alert(
          'Cuenta creada',
          'Revisa tu correo para confirmar tu cuenta y luego inicia sesión.'
        );
      } else {
        Alert.alert('Listo', 'Cuenta creada e iniciada sesión.');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    const e = email.trim();
    if (!e || !password) {
      Alert.alert('Datos inválidos', 'Escribe email y contraseña.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Bienvenida', 'Sesión iniciada.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Versión Pro</Text>
      <Text style={styles.subtitle}>
        Inicia sesión para guardar tus datos en la nube y usar la app en cualquier dispositivo.
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="mínimo 6 caracteres"
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonOutline}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonOutlineText}>Crear cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.screenBackground },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { marginTop: 6, color: Colors.textMuted, marginBottom: 16 },

  label: { marginTop: 10, fontWeight: '600', color: Colors.text },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },

  button: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },

  buttonOutline: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonOutlineText: { color: Colors.primary, fontWeight: '700' },
});
