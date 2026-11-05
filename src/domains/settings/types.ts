import type { Currency } from '../../constants/currencies';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  currency: Currency;
  theme: ThemePreference;
}

export const DEFAULT_SETTINGS: AppSettings = { currency: 'EUR', theme: 'system' };

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];
