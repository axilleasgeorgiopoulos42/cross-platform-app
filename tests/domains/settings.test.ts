import { createTestDb } from '../helpers/testDb';
import { runMigrations } from '../../src/db/migrations';
import { settingsService } from '../../src/domains/settings/service';
import { DEFAULT_SETTINGS } from '../../src/domains/settings/types';
import type { Currency } from '../../src/constants/currencies';

async function setup() {
  const db = await createTestDb();
  await runMigrations(db);
  return db;
}

describe('settingsService', () => {
  it('get returns defaults on empty db', async () => {
    const db = await setup();
    expect(await settingsService.get(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('set persists and get returns it', async () => {
    const db = await setup();
    const out = await settingsService.set(db, { currency: 'USD', theme: 'dark' });
    expect(out).toEqual({ currency: 'USD', theme: 'dark' });
    expect(await settingsService.get(db)).toEqual({ currency: 'USD', theme: 'dark' });
  });

  it('set rejects unsupported currency', async () => {
    const db = await setup();
    await expect(settingsService.set(db, { currency: 'XYZ' as Currency })).rejects.toThrow('Unsupported currency');
  });

  it('stored garbage theme falls back to default', async () => {
    const db = await setup();
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('theme', 'neon')");
    expect((await settingsService.get(db)).theme).toBe('system');
  });
});
