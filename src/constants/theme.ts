// Sage palette: calm, fresh, nature-forward. `primary` is the accent (CTAs and active states only).
export const colors = {
  light: {
    background: '#F0F7F2',
    surface: 'rgba(255,255,255,0.68)',
    surfaceAlt: 'rgba(45,179,104,0.08)',
    card: 'rgba(255,255,255,0.68)',
    tabBar: 'rgba(240,247,242,0.74)',
    border: 'rgba(45,179,104,0.14)',
    text: '#1A2A1E',
    textSecondary: '#7A9080',
    primary: '#2DB368',
    primaryForeground: '#FFFFFF',
    glow: 'rgba(45,179,104,0.33)',
    destructive: '#E5484D',
    success: '#2DB368',
    warning: '#E8912D',
  },
  dark: {
    background: '#060D09',
    surface: 'rgba(10,25,14,0.60)',
    surfaceAlt: 'rgba(52,199,89,0.10)',
    card: 'rgba(10,25,14,0.60)',
    tabBar: 'rgba(6,13,9,0.72)',
    border: 'rgba(45,179,104,0.14)',
    text: '#E8F5ED',
    textSecondary: '#4A6650',
    primary: '#34C759',
    primaryForeground: '#060D09',
    glow: 'rgba(52,199,89,0.33)',
    destructive: '#FF6B6B',
    success: '#34C759',
    warning: '#FF9F43',
  },
} as const;

export type ThemeColors = { [K in keyof typeof colors.light]: string };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
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

/** Glass blur strengths (px) and the shared colour/background transition. */
export const blur = { card: 20, tabBar: 28 } as const;
export const transitionMs = 350;
/** Height reserved for the floating tab bar (content inset), excluding the bottom safe area. */
export const tabBarHeight = 56;
