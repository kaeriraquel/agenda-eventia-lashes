// constants/theme.ts
// Paleta "rosa refinado": mucho blanco, rosa palo como acento y texto carbón.
// primary (#B35A79) tiene contraste 4.5:1 con texto blanco -> legible en botones.

export const Colors = {
  // Fondos
  appBackground: '#FAF7F8',
  screenBackground: '#FAF7F8',
  cardBackground: '#FFFFFF',
  surfaceMuted: '#F4EEF1', // fondos de inputs/segmentos

  // Marca
  primary: '#B35A79', // botones, links, iconos activos
  primaryLight: '#E8A0B4', // rosa palo decorativo
  primarySoft: '#F7E6EC', // fondos suaves rosados
  primaryDark: '#8E4560',

  // Acento nude
  accentNude: '#E9CDBB',

  // Bordes y sombras
  borderSoft: '#EFE4E8',
  border: '#E3D6DB',
  shadowSoft: 'rgba(43,43,43,0.06)',

  // Texto
  text: '#2B2B2B',
  textSecondary: '#4A4547',
  textMuted: '#6F6A6C',
  textSubtle: '#A39DA0',
  onPrimary: '#FFFFFF',

  // Estados (texto / fondo suave)
  success: '#3E8E66',
  successSoft: '#E5F3EB',
  warning: '#B7791F',
  warningSoft: '#FBF0DC',
  danger: '#C24B4B',
  dangerSoft: '#FBE7E7',
  info: '#6D5DC2',
  infoSoft: '#ECE9FA',

  // Tabs
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#EFE4E8',
};

export const Radii = {
  sm: 10,
  md: 14,
  card: 18,
  pill: 999,
};

export const Spacing = {
  screenPadding: 20,
  cardPadding: 16,
  gapSmall: 8,
  gapMedium: 12,
  gapLarge: 20,
};

export const Typography = {
  display: { fontSize: 28, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 15, color: Colors.text },
  bodyMuted: { fontSize: 14, color: Colors.textMuted },
  caption: { fontSize: 12, color: Colors.textMuted },
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSubtle,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};

export const Shadow = {
  card: {
    shadowColor: '#2B2B2B',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: '#8E4560',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
};

/** Colores por estado de cita */
export const StatusColors: Record<string, { bg: string; text: string; label: string }> = {
  pendiente: { bg: '#FBF0DC', text: '#B7791F', label: 'Pendiente' },
  realizada: { bg: '#E5F3EB', text: '#3E8E66', label: 'Realizada' },
  cancelada: { bg: '#FBE7E7', text: '#C24B4B', label: 'Cancelada' },
  no_asistio: { bg: '#ECE9FA', text: '#6D5DC2', label: 'No asistió' },
};
