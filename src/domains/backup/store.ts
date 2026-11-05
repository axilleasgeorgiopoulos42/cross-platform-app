import { create } from 'zustand';
import { getDb } from '../../db/client';
import { useCalendarStore } from '../calendar/store';
import { useExpenseStore } from '../expenses/store';
import { useSettingsStore } from '../settings/store';
import { backupFilename } from './filename';
import { buildBackup, clearAllData, parseBackup, restoreBackup } from './service';

interface Counts {
  events: number;
  transactions: number;
}

interface BackupStore {
  error: string | null;

  clearError(): void;
  exportBackup(): Promise<{ filename: string; json: string } | null>;
  /** Validates only; touches nothing. Returns counts, or null with `error` set. */
  previewBackup(text: string): Counts | null;
  importBackup(text: string): Promise<Counts | null>;
  clearData(): Promise<boolean>;
}

async function refreshStores(): Promise<void> {
  const { year, month } = useCalendarStore.getState().currentMonth;
  await Promise.all([
    useSettingsStore.getState().load(),
    useExpenseStore.getState().loadTransactions(),
    useCalendarStore.getState().loadMonth(year, month),
  ]);
}

export const useBackupStore = create<BackupStore>((set) => ({
  error: null,

  clearError() {
    set({ error: null });
  },

  async exportBackup() {
    set({ error: null });
    try {
      const db = await getDb();
      const backup = await buildBackup(db);
      return { filename: backupFilename(new Date()), json: JSON.stringify(backup, null, 2) };
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  previewBackup(text) {
    set({ error: null });
    try {
      const backup = parseBackup(text);
      return { events: backup.events.length, transactions: backup.transactions.length };
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  async importBackup(text) {
    set({ error: null });
    try {
      const backup = parseBackup(text);
      const db = await getDb();
      const counts = await restoreBackup(db, backup);
      await refreshStores();
      return counts;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  async clearData() {
    set({ error: null });
    try {
      const db = await getDb();
      await clearAllData(db);
      await refreshStores();
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },
}));
