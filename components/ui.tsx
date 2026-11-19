// components/ui.tsx
// Componentes base del diseño "rosa refinado". Úsalos en lugar de estilos sueltos
// para que todas las pantallas se vean consistentes.
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radii, Shadow, Spacing, StatusColors, Typography } from '../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/* ------------------------------------------------------------------ */
/* Screen: contenedor con zona segura (no queda debajo de la cámara)   */
/* ------------------------------------------------------------------ */
export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const inner = [padded && { paddingHorizontal: Spacing.screenPadding }, contentStyle];
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingBottom: 120, paddingTop: 8 }, ...inner]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: 8 }, ...inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/* Encabezado grande de pantalla */
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text style={Typography.overline}>{subtitle}</Text> : null}
        <Text style={Typography.display}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/* Tarjeta blanca */
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/* Título de sección con acción opcional */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={Typography.heading}>{title}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* Botón */
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={v.fg} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const buttonVariants = {
  primary: { bg: Colors.primary, fg: Colors.onPrimary, border: Colors.primary },
  secondary: { bg: Colors.cardBackground, fg: Colors.primary, border: Colors.border },
  ghost: { bg: 'transparent', fg: Colors.primary, border: 'transparent' },
  danger: { bg: Colors.cardBackground, fg: Colors.danger, border: '#F1CFCF' },
  whatsapp: { bg: '#1F9E57', fg: '#FFFFFF', border: '#1F9E57' },
};

/* Chip seleccionable (filtros, opciones) */
export function Chip({
  label,
  active,
  onPress,
  icon,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && styles.chipActive, style]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={active ? Colors.onPrimary : Colors.textSecondary} />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* Etiqueta de estado de cita */
export function StatusBadge({ status }: { status: string }) {
  const s = StatusColors[status] ?? StatusColors.pendiente;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

/* Pastilla pequeña genérica */
export function Pill({
  label,
  color = Colors.primary,
  bg = Colors.primarySoft,
  icon,
}: {
  label: string;
  color?: string;
  bg?: string;
  icon?: IconName;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/* Círculo con iniciales */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials =
    (name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase() ?? '')
      .join('') || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: Colors.primaryDark, fontWeight: '700', fontSize: size * 0.38 }}>
        {initials}
      </Text>
    </View>
  );
}

/* Tarjeta de número (KPI) */
export function StatTile({
  label,
  value,
  icon,
  tone = 'primary',
  style,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
  tone?: 'primary' | 'success' | 'warning' | 'info';
  style?: StyleProp<ViewStyle>;
}) {
  const t = {
    primary: { c: Colors.primary, bg: Colors.primarySoft },
    success: { c: Colors.success, bg: Colors.successSoft },
    warning: { c: Colors.warning, bg: Colors.warningSoft },
    info: { c: Colors.info, bg: Colors.infoSoft },
  }[tone];
  return (
    <View style={[styles.card, styles.statTile, style]}>
      {icon ? (
        <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={16} color={t.c} />
        </View>
      ) : null}
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={Typography.caption}>{label}</Text>
    </View>
  );
}

/* Estado vacío */
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  text,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={Colors.primary} />
      </View>
      <Text style={[Typography.heading, { textAlign: 'center' }]}>{title}</Text>
      {text ? (
        <Text style={[Typography.bodyMuted, { textAlign: 'center', marginTop: 4 }]}>{text}</Text>
      ) : null}
      {action && onAction ? (
        <Button title={action} onPress={onAction} small style={{ marginTop: 14 }} icon="add" />
      ) : null}
    </View>
  );
}

/* Fila de lista con ícono (menús) */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  last,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[styles.listRow, !last && styles.listRowBorder]}
    >
      {icon ? (
        <View style={styles.listIcon}>
          <Ionicons name={icon} size={18} color={Colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text style={Typography.caption}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textSubtle} /> : null)}
    </TouchableOpacity>
  );
}

/* Botón flotante (+) */
export function Fab({ onPress, icon = 'add' }: { onPress: () => void; icon?: IconName }) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={28} color={Colors.onPrimary} />
    </TouchableOpacity>
  );
}

/* Texto de etiqueta de formulario */
export function FieldLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.fieldLabel, style]}>{children}</Text>;
}

export const formStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
});

/* Formato de dinero MXN */
export function money(n: number | null | undefined) {
  const v = n ?? 0;
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.screenBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 18,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Radii.card,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    ...Shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionAction: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 14 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.onPrimary },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  statTile: { flex: 1, padding: 14, gap: 4 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSoft },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.floating,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 6,
  },
});
