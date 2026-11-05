import { filterByMonth, summarize, categoryBreakdown } from '../../src/domains/expenses/summary';
import type { Category, Transaction } from '../../src/domains/expenses/types';

let n = 0;
function tx(over: Partial<Transaction> & { date?: number }): Transaction {
  n += 1;
  return {
    id: `t${n}`,
    type: 'expense',
    amount: 10,
    category: 'food' as Category,
    note: null,
    date: new Date(2026, 10, 5).getTime(),
    createdAt: 0,
    ...over,
  };
}

describe('filterByMonth', () => {
  it('includes first and last millisecond of the month and excludes neighbours', () => {
    const y = 2026;
    const m = 10;
    const first = tx({ date: new Date(y, m, 1).getTime() });
    const last = tx({ date: new Date(y, m + 1, 0, 23, 59, 59, 999).getTime() });
    const before = tx({ date: new Date(y, m, 1).getTime() - 1 });
    const after = tx({ date: new Date(y, m + 1, 0, 23, 59, 59, 999).getTime() + 1 });
    const out = filterByMonth([before, first, last, after], y, m);
    expect(out).toEqual([first, last]);
  });

  it('wraps December correctly', () => {
    const dec = tx({ date: new Date(2026, 11, 31, 23, 59, 59, 999).getTime() });
    const jan = tx({ date: new Date(2027, 0, 1).getTime() });
    const out = filterByMonth([dec, jan], 2026, 11);
    expect(out).toEqual([dec]);
  });
});

describe('summarize', () => {
  it('on empty list is all zeros', () => {
    expect(summarize([])).toEqual({ totalIncome: 0, totalExpenses: 0, balance: 0 });
  });

  it('nets income minus expenses', () => {
    const s = summarize([
      tx({ type: 'income', amount: 100 }),
      tx({ type: 'expense', amount: 30 }),
      tx({ type: 'expense', amount: 20 }),
    ]);
    expect(s).toEqual({ totalIncome: 100, totalExpenses: 50, balance: 50 });
  });
});

describe('categoryBreakdown', () => {
  it('on empty list returns []', () => {
    expect(categoryBreakdown([])).toEqual([]);
  });

  it('ignores income; income-only input returns [] with no NaN', () => {
    const out = categoryBreakdown([tx({ type: 'income', amount: 500 })]);
    expect(out).toEqual([]);
    expect(JSON.stringify(out)).not.toContain('NaN');
    const mixed = categoryBreakdown([
      tx({ type: 'income', amount: 500, category: 'other' }),
      tx({ type: 'expense', amount: 40, category: 'food' }),
    ]);
    expect(mixed).toHaveLength(1);
    expect(mixed[0]).toEqual({ category: 'food', total: 40, share: 1 });
  });

  it('shares sum to 1 and are sorted descending', () => {
    const out = categoryBreakdown([
      tx({ amount: 10, category: 'food' }),
      tx({ amount: 5, category: 'food' }),
      tx({ amount: 70, category: 'bills' }),
      tx({ amount: 3.3, category: 'health' }),
      tx({ amount: 0.1, category: 'other' }),
    ]);
    expect(out.map((r) => r.category)).toEqual(['bills', 'food', 'health', 'other']);
    for (let i = 1; i < out.length; i++) expect(out[i - 1].total).toBeGreaterThanOrEqual(out[i].total);
    for (const r of out) {
      expect(Number.isNaN(r.share)).toBe(false);
      expect(r.share).toBeGreaterThanOrEqual(0);
      expect(r.share).toBeLessThanOrEqual(1);
    }
    expect(out.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1, 10);
  });

  it('zero-amount expenses do not produce NaN', () => {
    const out = categoryBreakdown([tx({ amount: 0 })]);
    expect(out).toEqual([]);
  });
});
