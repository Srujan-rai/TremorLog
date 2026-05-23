import { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#2e86c1',
  primaryDark: '#1a5276',
  primaryMuted: '#eaf4fb',
  background: '#f4f7fa',
  surface: '#ffffff',
  card: '#f8f9fa',
  border: '#e0e0e0',
  borderLight: '#eee',
  text: '#222',
  textSecondary: '#333',
  textMuted: '#555',
  textHint: '#888',
  textDisabled: '#aaa',
  success: '#27ae60',
  warning: '#f39c12',
  orange: '#e67e22',
  danger: '#e74c3c',
  disabled: '#bbb',
  warningBg: '#fdf2f2',
  warningBorder: '#f5c6c6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

type TypographyStyle = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'color'>;

export const typography: Record<string, TypographyStyle> = {
  display: { fontSize: 72, fontWeight: '700', lineHeight: 80, color: colors.primaryDark },
  title: { fontSize: 32, fontWeight: '700', lineHeight: 40, color: colors.primaryDark },
  heading: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: colors.primaryDark },
  body: { fontSize: 20, fontWeight: '400', lineHeight: 32, color: colors.textSecondary },
  caption: { fontSize: 16, fontWeight: '400', lineHeight: 24, color: colors.textMuted },
  button: { fontSize: 22, fontWeight: '700', lineHeight: 28, color: colors.surface },
  buttonSecondary: { fontSize: 20, fontWeight: '600', lineHeight: 26, color: colors.primaryDark },
};

export const shadows: Record<string, ViewStyle> = {
  card: {
    shadowColor: '#1a5276',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#1a5276',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

/** Hex values for PDF HTML (must match colors above). */
export const pdfColors = {
  text: colors.text,
  primaryDark: colors.primaryDark,
  primary: colors.primary,
  primaryMuted: colors.primaryMuted,
  border: colors.border,
  textHint: colors.textHint,
} as const;
