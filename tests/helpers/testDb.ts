import initSqlJs from 'sql.js';
import type { SQLiteDatabase } from 'expo-sqlite';

type Params = ReadonlyArray<string | number | null | Uint8Array>;

export async function createTestDb(): Promise<SQLiteDatabase> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();

  const db = {
    async execAsync(sql: string): Promise<void> {
      raw.exec(sql);
    },
    async runAsync(sql: string, params: Params = []) {
      raw.run(sql, params as any);
      const meta = raw.exec('SELECT changes(), last_insert_rowid()');
      const [changes, lastInsertRowId] = meta[0].values[0] as number[];
      return { changes, lastInsertRowId };
    },
    async getAllAsync<T>(sql: string, params: Params = []): Promise<T[]> {
      const stmt = raw.prepare(sql);
      try {
        stmt.bind(params as any);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async getFirstAsync<T>(sql: string, params: Params = []): Promise<T | null> {
      const rows = await db.getAllAsync<T>(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },
    async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
      raw.run('BEGIN');
      try {
        await fn();
        raw.run('COMMIT');
      } catch (e) {
        raw.run('ROLLBACK');
        throw e;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}
