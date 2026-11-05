import { createTestDb } from '../helpers/testDb';
import { runMigrations } from '../../src/db/migrations';
import { expenseService } from '../../src/domains/expenses/service';

async function setup() {
  const db = await createTestDb();
  await runMigrations(db);
  return db;
}

const base = { type: 'expense' as const, amount: 10, category: 'food' as const, note: null, date: 1000 };

describe('expenseService edits', () => {
  it('update changes category and note', async () => {
    const db = await setup();
    const t = await expenseService.create(db, base);
    const out = await expenseService.update(db, t.id, { category: 'bills', note: 'rent' });
    expect(out).toMatchObject({ id: t.id, category: 'bills', note: 'rent', amount: 10, type: 'expense' });
    expect(await expenseService.getById(db, t.id)).toEqual(out);
  });

  it('update rejects amount 0 and negative', async () => {
    const db = await setup();
    const t = await expenseService.create(db, base);
    await expect(expenseService.update(db, t.id, { amount: 0 })).rejects.toThrow('Amount must be greater than 0');
    await expect(expenseService.update(db, t.id, { amount: -5 })).rejects.toThrow('Amount must be greater than 0');
    expect((await expenseService.getById(db, t.id))?.amount).toBe(10);
  });

  it('update on unknown id throws Transaction not found', async () => {
    const db = await setup();
    await expect(expenseService.update(db, 'nope', { amount: 5 })).rejects.toThrow('Transaction not found');
  });

  it('getById returns null for unknown id', async () => {
    const db = await setup();
    expect(await expenseService.getById(db, 'nope')).toBeNull();
  });

  it('update recomputes getBalance', async () => {
    const db = await setup();
    await expenseService.create(db, { ...base, type: 'income', amount: 100 });
    const e = await expenseService.create(db, { ...base, amount: 30 });
    expect((await expenseService.getBalance(db)).balance).toBe(70);
    await expenseService.update(db, e.id, { amount: 50 });
    expect(await expenseService.getBalance(db)).toEqual({ totalIncome: 100, totalExpenses: 50, balance: 50 });
  });
});
