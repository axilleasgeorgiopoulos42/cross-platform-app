import { createTestDb } from '../helpers/testDb';
import { runMigrations } from '../../src/db/migrations';

async function version(db: Awaited<ReturnType<typeof createTestDb>>) {
  const r = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return r?.user_version;
}

describe('runMigrations', () => {
  it('fresh database reaches version 2', async () => {
    const db = await createTestDb();
    await runMigrations(db);
    expect(await version(db)).toBe(2);
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(events)');
    expect(cols.map((c) => c.name)).toContain('notes');
    const t = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'",
    );
    expect(t?.name).toBe('settings');
  });

  it('v1 database upgrades without losing rows', async () => {
    const db = await createTestDb();
    await db.execAsync(`
      CREATE TABLE events (id TEXT PRIMARY KEY, title TEXT NOT NULL, date INTEGER NOT NULL, time TEXT, created_at INTEGER NOT NULL);
      CREATE TABLE transactions (id TEXT PRIMARY KEY, type TEXT NOT NULL, amount REAL NOT NULL, category TEXT NOT NULL, note TEXT, date INTEGER NOT NULL, created_at INTEGER NOT NULL);
    `);
    await db.runAsync('INSERT INTO events VALUES (?, ?, ?, ?, ?)', ['e1', 'Dentist', 1000, '10:00', 5]);
    await db.runAsync('INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?)', ['t1', 'expense', 12.5, 'food', 'lunch', 2000, 6]);
    expect(await version(db)).toBe(0);

    await runMigrations(db);

    const ev = await db.getFirstAsync<{ id: string; title: string; notes: string | null }>('SELECT * FROM events WHERE id = ?', ['e1']);
    expect(ev).toMatchObject({ id: 'e1', title: 'Dentist', notes: null });
    const tx = await db.getFirstAsync<{ id: string; amount: number }>('SELECT * FROM transactions WHERE id = ?', ['t1']);
    expect(tx).toMatchObject({ id: 't1', amount: 12.5 });
    expect(await version(db)).toBe(2);
  });

  it('running migrations twice is a no-op', async () => {
    const db = await createTestDb();
    await runMigrations(db);
    await runMigrations(db);
    expect(await version(db)).toBe(2);
  });
});
