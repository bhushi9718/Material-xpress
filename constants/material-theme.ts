import { Platform } from 'react-native';

const headingFont = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif-medium',
  web: "'Trebuchet MS', 'Avenir Next', 'Segoe UI', sans-serif",
  default: 'System',
});

const bodyFont = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  web: "'Trebuchet MS', 'Avenir Next', 'Segoe UI', sans-serif",
  default: 'System',
});

export const materialTheme = {
  colors: {
    background: '#0F172A',
    backgroundStrong: '#1E293B',
    surface: '#1F2937',
    surfaceMuted: '#374151',
    border: 'rgba(255,255,255,0.08)',
    text: '#FFFFFF',
    textMuted: '#94A3B8',
    textSecondary: '#CBD5E1',
    primary: '#F97316',
    primaryPressed: '#EA580C',
    primarySoft: 'rgba(249, 115, 22, 0.15)',
    accent: '#FB923C',
    accentSoft: 'rgba(251, 146, 60, 0.15)',
    terracotta: '#F97316',
    terracottaSoft: 'rgba(249, 115, 22, 0.15)',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#FACC15',
    white: '#FFFFFF',
  },
  radius: {
    xs: 8,
    sm: 14,
    md: 18,
    lg: 24,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 40,
    xxxxxl: 48,
  },
  typography: {
    display: {
      fontFamily: headingFont,
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '700' as const,
    },
    h1: {
      fontFamily: headingFont,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '700' as const,
    },
    h2: {
      fontFamily: headingFont,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
    },
    h3: {
      fontFamily: headingFont,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700' as const,
    },
    body: {
      fontFamily: bodyFont,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    label: {
      fontFamily: bodyFont,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
    },
    caption: {
      fontFamily: bodyFont,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
    },
    button: {
      fontFamily: bodyFont,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
    },
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  screenPadding: 20,
};
