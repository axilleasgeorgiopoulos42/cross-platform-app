import {
  EMPTY_FILTER,
  filterTransactions,
  isFilterActive,
  type TransactionFilter,
} from '../../src/domains/expenses/search';
import type { Category, Transaction } from '../../src/domains/expenses/types';

let n = 0;
function tx(over: Partial<Transaction> & { date: number }): Transaction {
  n += 1;
  return {
    id: `t${n}`,
    type: 'expense',
    amount: 10,
    category: 'other' as Category,
    note: null,
    createdAt: 0,
    ...over,
  };
}

const f = (over: Partial<TransactionFilter>): TransactionFilter => ({ ...EMPTY_FILTER, ...over });
const ids = (txs: Transaction[]) => txs.map((t) => t.id);

const d1 = new Date(2026, 0, 10, 12).getTime();
const d2 = new Date(2026, 0, 15, 12).getTime();
const d3 = new Date(2026, 0, 20, 12).getTime();

describe('filterTransactions', () => {
  const a = tx({ id: 'a', date: d1, category: 'food', note: 'Lunch' });
  const b = tx({ id: 'b', date: d2, category: 'transport', note: 'Bus ticket' });
  const c = tx({ id: 'c', date: d3, category: 'bills', note: 'Καφές' });
  const all = [a, b, c];

  it('returns all newest first when inactive', () => {
    expect(ids(filterTransactions(all, EMPTY_FILTER))).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input', () => {
    const input = [a, b, c];
    filterTransactions(input, EMPTY_FILTER);
    expect(ids(input)).toEqual(['a', 'b', 'c']);
  });

  it('matches query on note', () => {
    expect(ids(filterTransactions(all, f({ query: 'bus' })))).toEqual(['b']);
  });

  it('matches query on category label and key', () => {
    expect(ids(filterTransactions(all, f({ query: 'Food' })))).toEqual(['a']);
    expect(ids(filterTransactions(all, f({ query: 'food' })))).toEqual(['a']);
  });

  it('matches by exact category', () => {
    expect(ids(filterTransactions(all, f({ category: 'transport' })))).toEqual(['b']);
  });

  it('filters by from only', () => {
    expect(ids(filterTransactions(all, f({ from: d2 })))).toEqual(['c', 'b']);
  });

  it('filters by to only', () => {
    expect(ids(filterTransactions(all, f({ to: d2 })))).toEqual(['b', 'a']);
  });

  it('combines criteria with AND', () => {
    expect(ids(filterTransactions(all, f({ query: 'u', category: 'transport', from: d1, to: d3 })))).toEqual(['b']);
    expect(filterTransactions(all, f({ query: 'lunch', category: 'transport' }))).toEqual([]);
  });

  it('includes the whole to day and excludes the next day', () => {
    const day = new Date(2026, 0, 15, 0, 0, 0, 0).getTime();
    const last = tx({ id: 'last', date: new Date(2026, 0, 15, 23, 59, 59, 999).getTime() });
    const next = tx({ id: 'next', date: new Date(2026, 0, 16, 0, 0, 0, 0).getTime() });
    expect(ids(filterTransactions([last, next], f({ to: day })))).toEqual(['last']);
  });

  it('includes the start of the from day', () => {
    const start = new Date(2026, 0, 15, 0, 0, 0, 0).getTime();
    const atStart = tx({ id: 'start', date: start });
    const before = tx({ id: 'before', date: start - 1 });
    expect(ids(filterTransactions([atStart, before], f({ from: start })))).toEqual(['start']);
  });

  it('handles regex characters and surrounding spaces', () => {
    expect(() => filterTransactions(all, f({ query: '  (*[  ' }))).not.toThrow();
    const p = tx({ id: 'p', date: d1, note: 'a(b' });
    expect(ids(filterTransactions([p], f({ query: ' ( ' })))).toEqual(['p']);
  });

  it('matches Greek ignoring accents and case', () => {
    expect(ids(filterTransactions(all, f({ query: 'καφες' })))).toEqual(['c']);
  });

  it('treats a whitespace-only query as no query', () => {
    expect(ids(filterTransactions(all, f({ query: '   ' })))).toEqual(['c', 'b', 'a']);
  });
});

describe('isFilterActive', () => {
  it('is false for the empty filter', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive(f({ query: '   ' }))).toBe(false);
  });

  it('is true when any single field is set', () => {
    expect(isFilterActive(f({ query: 'x' }))).toBe(true);
    expect(isFilterActive(f({ category: 'food' }))).toBe(true);
    expect(isFilterActive(f({ from: 0 }))).toBe(true);
    expect(isFilterActive(f({ to: 0 }))).toBe(true);
  });
});
