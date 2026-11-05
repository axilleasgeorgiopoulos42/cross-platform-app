import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 2;

async function getVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  let version = await getVersion(db);

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date INTEGER NOT NULL,
        time TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        date INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    await db.execAsync('PRAGMA user_version = 1');
    version = 1;
  }

  if (version < 2) {
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(events)');
    if (!cols.some((c) => c.name === 'notes')) {
      await db.execAsync('ALTER TABLE events ADD COLUMN notes TEXT');
    }
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    );
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}
