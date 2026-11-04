export const colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceAlt: '#F1F3F5',
    border: '#DEE2E6',
    text: '#212529',
    textSecondary: '#6C757D',
    primary: '#228BE6',
    primaryForeground: '#FFFFFF',
    destructive: '#FA5252',
    success: '#40C057',
    warning: '#FD7E14',
  },
  dark: {
    background: '#1A1B1E',
    surface: '#25262B',
    surfaceAlt: '#2C2E33',
    border: '#373A40',
    text: '#F8F9FA',
    textSecondary: '#909296',
    primary: '#4DABF7',
    primaryForeground: '#1A1B1E',
    destructive: '#FF6B6B',
    success: '#51CF66',
    warning: '#FF922B',
  },
} as const;

export type ThemeColors = typeof colors.light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;
