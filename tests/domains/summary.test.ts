import { filterByMonth, summarize, categoryBreakdown, groupByCategory } from '../../src/domains/expenses/summary';
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

describe('groupByCategory', () => {
  it('[] -> []', () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it('income only -> []', () => {
    expect(groupByCategory([tx({ type: 'income', amount: 500 })])).toEqual([]);
  });

  it('zero-amount expenses only -> []', () => {
    expect(groupByCategory([tx({ amount: 0 }), tx({ amount: 0, category: 'bills' })])).toEqual([]);
  });

  it('orders groups by total descending with totals and shares summing to 1', () => {
    const out = groupByCategory([
      tx({ amount: 10, category: 'food' }),
      tx({ amount: 30, category: 'food' }),
      tx({ amount: 60, category: 'bills' }),
    ]);
    expect(out.map((g) => g.category)).toEqual(['bills', 'food']);
    expect(out[0].total).toBe(60);
    expect(out[0].share).toBeCloseTo(0.6, 10);
    expect(out[1].total).toBe(40);
    expect(out[1].share).toBeCloseTo(0.4, 10);
    expect(out.reduce((a, g) => a + g.share, 0)).toBeCloseTo(1, 10);
  });

  it('entries hold only that category, newest date first, and match entries.length', () => {
    const food1 = tx({ category: 'food', date: new Date(2026, 10, 1).getTime() });
    const food2 = tx({ category: 'food', date: new Date(2026, 10, 3).getTime() });
    const food3 = tx({ category: 'food', date: new Date(2026, 10, 2).getTime() });
    const bill = tx({ category: 'bills', amount: 60, date: new Date(2026, 10, 2).getTime() });
    const income = tx({ type: 'income', category: 'food', amount: 999 });
    const out = groupByCategory([food1, bill, food2, income, food3]);
    const food = out.find((g) => g.category === 'food');
    expect(food).toBeDefined();
    expect(food!.entries.map((e) => e.id)).toEqual([food2.id, food3.id, food1.id]);
    expect(food!.entries.every((e) => e.category === 'food' && e.type === 'expense')).toBe(true);
    expect(food!.entries.length).toBe(3);
    const billsGroup = out.find((g) => g.category === 'bills');
    expect(billsGroup!.entries).toEqual([bill]);
    expect(billsGroup!.entries.length).toBe(1);
  });

  it('removing the only entry of a category drops that group', () => {
    const food = tx({ category: 'food', amount: 20 });
    const bill = tx({ category: 'bills', amount: 80 });
    expect(groupByCategory([food, bill]).map((g) => g.category)).toEqual(['bills', 'food']);
    const after = groupByCategory([bill]);
    expect(after.map((g) => g.category)).toEqual(['bills']);
    expect(after[0].share).toBe(1);
  });
});
