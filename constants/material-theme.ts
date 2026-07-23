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
    background: '#F5EFE6',
    backgroundStrong: '#E8DEC8',
    surface: '#FFFCF8',
    surfaceMuted: '#F2E9DB',
    border: '#E1D5C4',
    text: '#18211B',
    textMuted: '#6A685F',
    primary: '#123B2C',
    primaryPressed: '#0D2B20',
    primarySoft: '#DCE8E1',
    accent: '#B38843',
    accentSoft: '#F3E4C9',
    terracotta: '#A55C35',
    terracottaSoft: '#F6E0D6',
    success: '#2C7A57',
    danger: '#A04836',
    white: '#FFFFFF',
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 26,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
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
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500' as const,
    },
    label: {
      fontFamily: bodyFont,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600' as const,
    },
    caption: {
      fontFamily: bodyFont,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
    },
  },
  shadow: {
    shadowColor: '#2D2418',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  screenPadding: 20,
};
