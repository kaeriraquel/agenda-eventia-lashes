// app/auth.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';
import { getAuthRedirectUrl, signInWithGoogle } from '../lib/authRedirect';

type Mode = 'login' | 'signup';
type Msg = { kind: 'error' | 'info' | 'ok'; text: string } | null;

// Mostrar el botón de Google solo cuando ya esté configurado en Google Cloud + Supabase.
// Para activarlo: en .env pon EXPO_PUBLIC_ENABLE_GOOGLE=true y reinicia con `npx expo start -c`.
const GOOGLE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_GOOGLE === 'true';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Traduce los errores más comunes de Supabase
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Tu correo aún no está confirmado. Revisa tu bandeja (y spam) o reenvía el correo.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  if (m.includes('password')) return 'La contraseña no es válida (mínimo 6 caracteres).';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión. Revisa tu internet.';
  return message;
}

export default function AuthScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null); // cuenta creada sin confirmar

  const switchMode = (m: Mode) => {
    setMode(m);
    setPassword('');
    setConfirm('');
    setMsg(null);
  };

  // Valida y devuelve el texto del primer error, o null si todo está bien
  const validate = (): string | null => {
    const e = email.trim();
    if (!e) return 'Escribe tu correo.';
    if (!EMAIL_RE.test(e)) return 'Ese correo no parece válido.';
    if (!password) return 'Escribe tu contraseña.';
    if (mode === 'signup') {
      if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
      if (password !== confirm) return 'Las contraseñas no coinciden.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setMsg({ kind: 'error', text: err });
      return;
    }

    const e = email.trim().toLowerCase();
    setMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: e,
          password,
          // el enlace del correo regresa a la app
          options: { emailRedirectTo: getAuthRedirectUrl() },
        });
        if (error) {
          setMsg({ kind: 'error', text: friendlyError(error.message) });
          return;
        }

        if (data.session) {
          // Confirmación de correo desactivada: ya quedó con sesión
          router.replace('/(tabs)');
          return;
        }

        // Requiere confirmar correo: limpiar el formulario y pasar a "Iniciar sesión"
        setPendingEmail(e);
        setMode('login');
        setPassword('');
        setConfirm('');
        setMsg({
          kind: 'info',
          text: `Te enviamos un correo a ${e}. Abre el enlace para confirmar tu cuenta y después inicia sesión aquí. Si no llega en unos minutos, revisa spam o reenvíalo.`,
        });
        return;
      }

      // login
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) setPendingEmail(e);
        setMsg({ kind: 'error', text: friendlyError(error.message) });
        return;
      }

      setPassword('');
      router.replace('/(tabs)');
    } catch (ex: any) {
      setMsg({ kind: 'error', text: friendlyError(ex?.message ?? 'Algo salió mal.') });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: { emailRedirectTo: getAuthRedirectUrl() },
      });
      setMsg(
        error
          ? { kind: 'error', text: friendlyError(error.message) }
          : { kind: 'ok', text: `Correo reenviado a ${pendingEmail}.` }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.ok) {
        router.replace('/(tabs)');
      } else if (!res.cancelled) {
        setMsg({ kind: 'error', text: friendlyError(res.error ?? 'No se pudo entrar con Google.') });
      }
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.screenBackground }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../assets/images/logo-eventia-agenda.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Bienvenida a tu agenda</Text>
        <Text style={styles.subtitle}>
          Citas, clientas y precios de tu estudio de pestañas y uñas. Tus datos quedan guardados en
          tu cuenta aunque cambies de teléfono.
        </Text>

        {/* Google */}
        {GOOGLE_ENABLED && (
        <>
        <TouchableOpacity
          style={[styles.googleBtn, loading && { opacity: 0.7 }]}
          onPress={handleGoogle}
          disabled={loading}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Continuar con Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o con tu correo</Text>
          <View style={styles.dividerLine} />
        </View>
        </>
        )}

        {/* Selector de modo */}
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentItem, !isSignup && styles.segmentActive]}
            onPress={() => switchMode('login')}
          >
            <Text style={[styles.segmentText, !isSignup && styles.segmentTextActive]}>
              Iniciar sesión
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentItem, isSignup && styles.segmentActive]}
            onPress={() => switchMode('signup')}
          >
            <Text style={[styles.segmentText, isSignup && styles.segmentTextActive]}>
              Crear cuenta
            </Text>
          </TouchableOpacity>
        </View>

        {msg && (
          <View
            style={[
              styles.msg,
              msg.kind === 'error' && styles.msgError,
              msg.kind === 'info' && styles.msgInfo,
              msg.kind === 'ok' && styles.msgOk,
            ]}
          >
            <Text style={styles.msgText}>{msg.text}</Text>
          </View>
        )}

        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={t => { setEmail(t); setMsg(null); }}
          placeholder="tu@email.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />

        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginTop: 0 }]}
            value={password}
            onChangeText={t => { setPassword(t); setMsg(null); }}
            placeholder={isSignup ? 'mínimo 6 caracteres' : 'tu contraseña'}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType={isSignup ? 'newPassword' : 'password'}
          />
          <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
          </TouchableOpacity>
        </View>

        {isSignup && (
          <>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={t => { setConfirm(t); setMsg(null); }}
              placeholder="repite tu contraseña"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignup ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
          )}
        </TouchableOpacity>

        {pendingEmail && !isSignup && (
          <TouchableOpacity style={styles.linkBtn} onPress={handleResend} disabled={loading}>
            <Text style={styles.linkText}>Reenviar correo de confirmación</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 48, flexGrow: 1 },
  logo: { width: 110, height: 110, alignSelf: 'center', marginBottom: 12, borderRadius: 24 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  subtitle: { marginTop: 6, color: Colors.textMuted, marginBottom: 20, textAlign: 'center', lineHeight: 20 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 999,
    paddingVertical: 12,
    gap: 10,
  },
  googleG: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600', color: '#3C4043' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderSoft },
  dividerText: { color: Colors.textMuted, fontSize: 13 },

  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    padding: 4,
    marginBottom: 8,
  },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontWeight: '600', color: Colors.textMuted },
  segmentTextActive: { color: '#fff' },

  msg: { borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1 },
  msgError: { backgroundColor: '#FDECEC', borderColor: '#F5C2C2' },
  msgInfo: { backgroundColor: '#EEF4FD', borderColor: '#C9DBF5' },
  msgOk: { backgroundColor: '#EAF7EE', borderColor: '#BFE5CB' },
  msgText: { color: Colors.text, lineHeight: 20 },

  label: { marginTop: 14, fontWeight: '600', color: Colors.text },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    color: Colors.text,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  eyeBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  eyeText: { color: Colors.primary, fontWeight: '600' },

  button: {
    marginTop: 22,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  linkBtn: { marginTop: 14, alignItems: 'center' },
  linkText: { color: Colors.primary, fontWeight: '600' },
});
