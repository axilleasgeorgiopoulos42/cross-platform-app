import type { CalendarEvent } from '../calendar/types';
import type { Transaction } from '../expenses/types';
import type { AppSettings } from '../settings/types';

export interface BackupFile {
  version: 1;
  exportedAt: number;
  events: CalendarEvent[];
  transactions: Transaction[];
  settings: AppSettings;
}
