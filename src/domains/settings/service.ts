import type { SQLiteDatabase } from 'expo-sqlite';
import { CURRENCIES, type Currency } from '../../constants/currencies';
import {
  DEFAULT_SETTINGS,
  THEME_PREFERENCES,
  type AppSettings,
  type ThemePreference,
} from './types';

export const settingsService = {
  async get(db: SQLiteDatabase): Promise<AppSettings> {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings',
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const currency = map.get('currency');
    const theme = map.get('theme');
    return {
      currency: CURRENCIES.includes(currency as Currency)
        ? (currency as Currency)
        : DEFAULT_SETTINGS.currency,
      theme: THEME_PREFERENCES.includes(theme as ThemePreference)
        ? (theme as ThemePreference)
        : DEFAULT_SETTINGS.theme,
    };
  },

  async set(db: SQLiteDatabase, patch: Partial<AppSettings>): Promise<AppSettings> {
    if (patch.currency !== undefined && !CURRENCIES.includes(patch.currency)) {
      throw new Error(`Unsupported currency: ${patch.currency}`);
    }
    if (patch.theme !== undefined && !THEME_PREFERENCES.includes(patch.theme)) {
      throw new Error(`Unsupported theme: ${patch.theme}`);
    }
    const upsert = 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value';
    if (patch.currency !== undefined) await db.runAsync(upsert, ['currency', patch.currency]);
    if (patch.theme !== undefined) await db.runAsync(upsert, ['theme', patch.theme]);
    return this.get(db);
  },
};
