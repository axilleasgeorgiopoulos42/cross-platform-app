import { CATEGORIES } from '../../constants/categories';
import { endOfDay } from '../../lib/dates';
import { matchesQuery } from '../../lib/text';
import type { Category, Transaction } from './types';

export interface TransactionFilter {
  query: string;
  category: Category | null;
  from: number | null;
  to: number | null;
}

export const EMPTY_FILTER: TransactionFilter = { query: '', category: null, from: null, to: null };

export function isFilterActive(f: TransactionFilter): boolean {
  return f.query.trim() !== '' || f.category !== null || f.from !== null || f.to !== null;
}

function categoryLabel(key: Category): string | undefined {
  return CATEGORIES.find((c) => c.key === key)?.label;
}

export function filterTransactions(txs: Transaction[], f: TransactionFilter): Transaction[] {
  const hasQuery = f.query.trim() !== '';
  const to = f.to === null ? null : endOfDay(f.to);
  return txs
    .filter((t) => {
      if (f.category !== null && t.category !== f.category) return false;
      if (f.from !== null && t.date < f.from) return false;
      if (to !== null && t.date > to) return false;
      if (hasQuery && !matchesQuery([t.note, t.category, categoryLabel(t.category)], f.query)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.date - a.date);
}
