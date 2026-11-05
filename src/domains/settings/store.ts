import { create } from 'zustand';
import type { Currency } from '../../constants/currencies';
import { getDb } from '../../db/client';
import { settingsService } from './service';
import { DEFAULT_SETTINGS, type AppSettings, type ThemePreference } from './types';

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  error: string | null;

  load(): Promise<void>;
  clearError(): void;
  setCurrency(c: Currency): Promise<void>;
  setTheme(t: ThemePreference): Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  error: null,

  clearError() {
    set({ error: null });
  },

  async load() {
    try {
      const db = await getDb();
      const settings = await settingsService.get(db);
      set({ settings, loaded: true, error: null });
    } catch (e) {
      set({ error: (e as Error).message, loaded: true });
    }
  },

  async setCurrency(c: Currency) {
    try {
      const db = await getDb();
      const settings = await settingsService.set(db, { currency: c });
      set({ settings, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async setTheme(t: ThemePreference) {
    try {
      const db = await getDb();
      const settings = await settingsService.set(db, { theme: t });
      set({ settings, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
