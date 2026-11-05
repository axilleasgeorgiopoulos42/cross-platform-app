import type { SQLiteDatabase } from 'expo-sqlite';
import { CATEGORIES } from '../../constants/categories';
import { CURRENCIES } from '../../constants/currencies';
import type { CalendarEvent } from '../calendar/types';
import type { Transaction } from '../expenses/types';
import { settingsService } from '../settings/service';
import { THEME_PREFERENCES, type AppSettings } from '../settings/types';
import type { BackupFile } from './types';

interface EventRow {
  id: string;
  title: string;
  date: number;
  time: string | null;
  notes: string | null;
  created_at: number;
}

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  category: string;
  note: string | null;
  date: number;
  created_at: number;
}

function fail(reason: string): never {
  throw new Error(`Invalid backup file: ${reason}`);
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const isNullableString = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

function parseEvent(raw: unknown, i: number): CalendarEvent {
  if (!isRecord(raw)) fail(`event ${i} is not an object`);
  const { id, title, date, time, notes, createdAt } = raw;
  if (typeof id !== 'string' || !id) fail(`event ${i} has an invalid id`);
  if (typeof title !== 'string' || !title.trim()) fail(`event ${i} has no title`);
  if (!isFiniteNumber(date)) fail(`event ${i} has an invalid date`);
  if (!isNullableString(time ?? null)) fail(`event ${i} has an invalid time`);
  if (!isNullableString(notes ?? null)) fail(`event ${i} has invalid notes`);
  if (!isFiniteNumber(createdAt)) fail(`event ${i} has an invalid createdAt`);
  return {
    id,
    title,
    date,
    time: (time ?? null) as string | null,
    notes: (notes ?? null) as string | null,
    createdAt,
  };
}

function parseTransaction(raw: unknown, i: number): Transaction {
  if (!isRecord(raw)) fail(`transaction ${i} is not an object`);
  const { id, type, amount, category, note, date, createdAt } = raw;
  if (typeof id !== 'string' || !id) fail(`transaction ${i} has an invalid id`);
  if (type !== 'income' && type !== 'expense') fail(`transaction ${i} has an invalid type`);
  if (!isFiniteNumber(amount) || amount <= 0) fail(`transaction ${i} has an invalid amount`);
  const cat = CATEGORIES.find((c) => c.key === category);
  if (!cat) fail(`transaction ${i} has an unknown category`);
  if (!isNullableString(note ?? null)) fail(`transaction ${i} has an invalid note`);
  if (!isFiniteNumber(date)) fail(`transaction ${i} has an invalid date`);
  if (!isFiniteNumber(createdAt)) fail(`transaction ${i} has an invalid createdAt`);
  return {
    id,
    type,
    amount,
    category: cat.key,
    note: (note ?? null) as string | null,
    date,
    createdAt,
  };
}

function parseSettings(raw: unknown): AppSettings {
  if (!isRecord(raw)) fail('settings is not an object');
  const { currency, theme } = raw;
  const c = CURRENCIES.find((x) => x === currency);
  if (!c) fail('settings has an unsupported currency');
  const t = THEME_PREFERENCES.find((x) => x === theme);
  if (!t) fail('settings has an unsupported theme');
  return { currency: c, theme: t };
}

/** Validates the whole file structurally; throws before anything touches the database. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('not valid JSON');
  }
  if (!isRecord(data)) fail('expected a JSON object');
  if (data.version !== 1) fail('unsupported version');
  if (!isFiniteNumber(data.exportedAt)) fail('missing exportedAt');
  if (!Array.isArray(data.events)) fail('events must be an array');
  if (!Array.isArray(data.transactions)) fail('transactions must be an array');
  const events = data.events.map(parseEvent);
  const transactions = data.transactions.map(parseTransaction);
  const settings = parseSettings(data.settings);
  const eventIds = new Set<string>();
  for (const e of events) {
    if (eventIds.has(e.id)) fail(`duplicate event id ${e.id}`);
    eventIds.add(e.id);
  }
  const txIds = new Set<string>();
  for (const t of transactions) {
    if (txIds.has(t.id)) fail(`duplicate transaction id ${t.id}`);
    txIds.add(t.id);
  }
  return { version: 1, exportedAt: data.exportedAt, events, transactions, settings };
}

export async function buildBackup(db: SQLiteDatabase): Promise<BackupFile> {
  const eventRows = await db.getAllAsync<EventRow>(
    'SELECT * FROM events ORDER BY date, created_at, id',
  );
  const txRows = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions ORDER BY date, created_at, id',
  );
  return {
    version: 1,
    exportedAt: Date.now(),
    events: eventRows.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date,
      time: r.time,
      notes: r.notes,
      createdAt: r.created_at,
    })),
    transactions: txRows.map((r) => ({
      id: r.id,
      type: r.type as Transaction['type'],
      amount: r.amount,
      category: r.category as Transaction['category'],
      note: r.note,
      date: r.date,
      createdAt: r.created_at,
    })),
    settings: await settingsService.get(db),
  };
}

/** Replaces all data atomically; any failure rolls back and leaves existing data untouched. */
export async function restoreBackup(
  db: SQLiteDatabase,
  backup: BackupFile,
): Promise<{ events: number; transactions: number }> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM events');
    await db.runAsync('DELETE FROM transactions');
    for (const e of backup.events) {
      await db.runAsync(
        'INSERT INTO events (id, title, date, time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [e.id, e.title, e.date, e.time, e.notes, e.createdAt],
      );
    }
    for (const t of backup.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, type, amount, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.type, t.amount, t.category, t.note, t.date, t.createdAt],
      );
    }
    await settingsService.set(db, backup.settings);
  });
  return { events: backup.events.length, transactions: backup.transactions.length };
}

/** Deletes events and transactions; settings are kept. */
export async function clearAllData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM events');
    await db.runAsync('DELETE FROM transactions');
  });
}
