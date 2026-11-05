import {
  bucketExpenses,
  bucketGranularity,
  visibleLabelIndexes,
} from '../../src/domains/expenses/chart';
import { customRange, rangeFor } from '../../src/domains/expenses/range';
import type { Transaction } from '../../src/domains/expenses/types';

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();

let seq = 0;
function tx(date: number, amount: number, type: 'income' | 'expense' = 'expense'): Transaction {
  seq += 1;
  return { id: `t${seq}`, type, amount, category: 'other', note: null, date, createdAt: date };
}

describe('bucketGranularity', () => {
  const from = day(2026, 0, 1);
  const span = (days: number) => customRange(from, day(2026, 0, 1 + days - 1));

  test('thresholds by calendar-day count', () => {
    expect(bucketGranularity(span(31))).toBe('day');
    expect(bucketGranularity(span(32))).toBe('week');
    expect(bucketGranularity(span(183))).toBe('week');
    expect(bucketGranularity(span(184))).toBe('month');
  });
});

describe('bucketExpenses daily', () => {
  const nov = rangeFor('month', day(2026, 10, 15));

  test('November 2026 has 30 buckets labelled by day of month', () => {
    const b = bucketExpenses([], nov);
    expect(b).toHaveLength(30);
    expect(b[0].label).toBe('1');
    expect(b[29].label).toBe('30');
    expect(b.every((x) => x.total === 0)).toBe(true);
  });

  test('single-day range yields exactly one bucket', () => {
    const r = customRange(day(2026, 10, 5), day(2026, 10, 5));
    const b = bucketExpenses([tx(day(2026, 10, 5), 7)], r);
    expect(b).toHaveLength(1);
    expect(b[0].total).toBe(7);
  });

  test('ignores income and sums expenses on one day', () => {
    const b = bucketExpenses(
      [
        tx(day(2026, 10, 3, 9), 10),
        tx(day(2026, 10, 3, 18), 5.5),
        tx(day(2026, 10, 3, 10), 100, 'income'),
      ],
      nov,
    );
    expect(b[2].total).toBe(15.5);
    expect(b.reduce((s, x) => s + x.total, 0)).toBe(15.5);
  });

  test('transaction at range.to is in the last bucket; range.to + 1 is in none', () => {
    const b = bucketExpenses([tx(nov.to, 4), tx(nov.to + 1, 9), tx(nov.from - 1, 8)], nov);
    expect(b[29].total).toBe(4);
    expect(b.reduce((s, x) => s + x.total, 0)).toBe(4);
  });

  test('empty list and income only give zero totals, no NaN', () => {
    for (const list of [[], [tx(day(2026, 10, 2), 50, 'income')]]) {
      const b = bucketExpenses(list, nov);
      expect(b.every((x) => x.total === 0)).toBe(true);
    }
  });

  test('range across a DST change has one contiguous bucket per calendar day', () => {
    // 31 days around late March and late October
    for (const [m, d] of [[2, 15], [9, 15]]) {
      const r = customRange(day(2026, m, d), day(2026, m, d + 30));
      const b = bucketExpenses([], r);
      expect(b).toHaveLength(31);
      for (let i = 0; i < b.length - 1; i++) expect(b[i].end + 1).toBe(b[i + 1].start);
      expect(b[0].start).toBe(r.from);
      expect(b[30].end).toBe(r.to);
    }
  });
});

describe('bucketExpenses weekly', () => {
  // Wed 14 Jan 2026 - Tue 14 Apr 2026 (not aligned to Mondays)
  const r = customRange(day(2026, 0, 14), day(2026, 3, 14));

  test('buckets start on Mondays, ends clamped, totals preserved', () => {
    const txs = [
      tx(day(2026, 0, 14), 1),
      tx(day(2026, 1, 20), 2),
      tx(day(2026, 3, 14, 23), 4),
      tx(day(2026, 3, 15), 100),
      tx(day(2026, 0, 13), 100),
    ];
    const b = bucketExpenses(txs, r);
    expect(b[0].start).toBe(r.from);
    expect(b[b.length - 1].end).toBe(r.to);
    for (let i = 1; i < b.length; i++) {
      expect(new Date(b[i].start).getDay()).toBe(1);
      expect(b[i - 1].end + 1).toBe(b[i].start);
    }
    expect(b[0].label).toBe('14 Jan');
    expect(b.reduce((s, x) => s + x.total, 0)).toBe(7);
  });
});

describe('bucketExpenses monthly', () => {
  test('year range gives 12 buckets with short month labels', () => {
    const y = rangeFor('year', day(2026, 5, 1));
    const b = bucketExpenses([tx(day(2026, 11, 31, 23), 3), tx(day(2026, 0, 1, 0), 2)], y);
    expect(b).toHaveLength(12);
    expect(b.map((x) => x.label)).toEqual([
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]);
    expect(b[0].total).toBe(2);
    expect(b[11].total).toBe(3);
  });
});

describe('visibleLabelIndexes', () => {
  test('30 items', () => {
    const idx = visibleLabelIndexes(30);
    expect(idx.length).toBeLessThanOrEqual(6);
    expect(idx[0]).toBe(0);
    for (let i = 1; i < idx.length; i++) expect(idx[i]).toBeGreaterThan(idx[i - 1]);
    expect(idx.every((i) => i < 30)).toBe(true);
  });
  test('small and empty counts', () => {
    expect(visibleLabelIndexes(3)).toEqual([0, 1, 2]);
    expect(visibleLabelIndexes(0)).toEqual([]);
  });
});
