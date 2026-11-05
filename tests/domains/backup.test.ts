import { createTestDb } from '../helpers/testDb';
import { runMigrations } from '../../src/db/migrations';
import { calendarService } from '../../src/domains/calendar/service';
import { expenseService } from '../../src/domains/expenses/service';
import { settingsService } from '../../src/domains/settings/service';
import {
  buildBackup,
  clearAllData,
  parseBackup,
  restoreBackup,
} from '../../src/domains/backup/service';
import type { BackupFile } from '../../src/domains/backup/types';

async function setup() {
  const db = await createTestDb();
  await runMigrations(db);
  return db;
}

const DATE = new Date(2026, 10, 5).getTime();

async function seed(db: Awaited<ReturnType<typeof setup>>) {
  await calendarService.create(db, { title: 'Dentist', date: DATE, time: '10:00', notes: 'bring card' });
  await calendarService.create(db, { title: 'Lunch', date: DATE + 1000, time: null });
  await expenseService.create(db, { type: 'expense', amount: 12.5, category: 'food', note: 'pizza', date: DATE });
  await expenseService.create(db, { type: 'income', amount: 100, category: 'other', note: null, date: DATE + 5000 });
  await settingsService.set(db, { currency: 'USD', theme: 'dark' });
}

function validBackup(): any {
  return {
    version: 1,
    exportedAt: 1,
    events: [{ id: 'e1', title: 'T', date: DATE, time: null, notes: null, createdAt: 1 }],
    transactions: [
      { id: 't1', type: 'expense', amount: 5, category: 'food', note: null, date: DATE, createdAt: 1 },
    ],
    settings: { currency: 'EUR', theme: 'system' },
  };
}

describe('backup', () => {
  it('round trip', async () => {
    const a = await setup();
    await seed(a);
    const original = await buildBackup(a);
    expect(original.events).toHaveLength(2);
    expect(original.transactions).toHaveLength(2);
    const parsed = parseBackup(JSON.stringify(original));
    const b = await setup();
    const counts = await restoreBackup(b, parsed);
    expect(counts).toEqual({ events: 2, transactions: 2 });
    const copy = await buildBackup(b);
    expect({ ...copy, exportedAt: 0 }).toEqual({ ...original, exportedAt: 0 });
  });

  it('restore replaces rather than merges', async () => {
    const a = await setup();
    await seed(a);
    const backup = await buildBackup(a);
    const b = await setup();
    await restoreBackup(b, backup);
    await restoreBackup(b, backup);
    expect((await buildBackup(b)).events).toHaveLength(2);
    expect((await buildBackup(b)).transactions).toHaveLength(2);
  });

  describe('parseBackup rejects', () => {
    const bad = (mutate: (b: any) => void) => {
      const b = validBackup();
      mutate(b);
      return JSON.stringify(b);
    };
    const cases: Array<[string, string]> = [
      ['empty string', ''],
      ['not json', 'not json'],
      ['wrong version', '{"version":2}'],
      ['array', '[]'],
      ['event without title', bad((b) => delete b.events[0].title)],
      ['negative amount', bad((b) => (b.transactions[0].amount = -1))],
      ['unknown category', bad((b) => (b.transactions[0].category = 'crypto'))],
      ['bad type', bad((b) => (b.transactions[0].type = 'transfer'))],
      ['non-string id', bad((b) => (b.events[0].id = 5))],
      ['bad currency', bad((b) => (b.settings.currency = 'XYZ'))],
      ['non-finite date', bad((b) => (b.events[0].date = 'x'))],
      ['bad time', bad((b) => (b.events[0].time = 5))],
    ];
    it.each(cases)('%s', (_name, text) => {
      expect(() => parseBackup(text)).toThrow(/^Invalid backup file/);
    });

    it('accepts a valid backup', () => {
      expect(parseBackup(JSON.stringify(validBackup())).events).toHaveLength(1);
    });
  });

  it('failed restore keeps existing data', async () => {
    const db = await setup();
    const ev = await calendarService.create(db, { title: 'Keep me', date: DATE, time: null });
    const bad = {
      ...validBackup(),
      events: [
        { id: 'x1', title: 'ok', date: DATE, time: null, notes: null, createdAt: 1 },
        { id: 'x2', title: null, date: DATE, time: null, notes: null, createdAt: 1 },
      ],
    } as unknown as BackupFile;
    await expect(restoreBackup(db, bad)).rejects.toThrow();
    const after = await buildBackup(db);
    expect(after.events.map((e) => e.id)).toEqual([ev.id]);
  });

  it('clearAllData empties events and transactions but keeps settings defaults readable', async () => {
    const db = await setup();
    await calendarService.create(db, { title: 'A', date: DATE, time: null });
    await expenseService.create(db, { type: 'expense', amount: 1, category: 'food', note: null, date: DATE });
    await clearAllData(db);
    const b = await buildBackup(db);
    expect(b.events).toEqual([]);
    expect(b.transactions).toEqual([]);
    expect(await settingsService.get(db)).toEqual({ currency: 'EUR', theme: 'system' });
  });

  it('clearAllData leaves stored settings untouched', async () => {
    const db = await setup();
    await seed(db);
    await clearAllData(db);
    expect(await settingsService.get(db)).toEqual({ currency: 'USD', theme: 'dark' });
  });
});
