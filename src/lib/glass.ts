import { Platform, type ViewStyle } from 'react-native';
import { blur, transitionMs } from '../constants/theme';

/** Frosted-glass effect. Web only: React Native ignores backdrop blur, so native keeps the translucent fill. */
export function glass(px: number = blur.card): ViewStyle {
  if (Platform.OS !== 'web') return {};
  const filter = `blur(${px}px) saturate(160%)`;
  return { backdropFilter: filter, WebkitBackdropFilter: filter } as unknown as ViewStyle;
}

/** 0.35s ease on colour and background changes (web only; theme switches fade instead of snapping). */
export function themeTransition(): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return {
    transitionProperty: 'background-color, border-color, color, box-shadow, opacity',
    transitionDuration: `${transitionMs}ms`,
    transitionTimingFunction: 'ease',
  } as unknown as ViewStyle;
}

/** Soft accent glow for interactive elements. */
export function glow(color: string): ViewStyle {
  return { boxShadow: `0 4px 16px ${color}` } as unknown as ViewStyle;
}
