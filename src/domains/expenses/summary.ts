import type { BalanceSummary, Category, Transaction } from './types';

export interface CategoryShare {
  category: Category;
  total: number;
  share: number;
}

export interface CategoryGroup {
  category: Category;
  total: number;
  share: number;
  entries: Transaction[];
}

/** Income entries (newest `date` first) with their total. */
export function incomeEntries(txs: Transaction[]): { entries: Transaction[]; total: number } {
  const entries = txs.filter((t) => t.type === 'income').sort((a, b) => b.date - a.date);
  return { entries, total: entries.reduce((s, t) => s + t.amount, 0) };
}

/** Transactions within the local-time calendar month. `month` is 0-11. */
export function filterByMonth(txs: Transaction[], year: number, month: number): Transaction[] {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return txs.filter((t) => t.date >= start && t.date <= end);
}

export function summarize(txs: Transaction[]): BalanceSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const t of txs) {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpenses += t.amount;
  }
  return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
}

/** Expense totals per category, sorted descending. Returns [] when there are no expenses. */
export function categoryBreakdown(txs: Transaction[]): CategoryShare[] {
  const totals = new Map<Category, number>();
  let grand = 0;
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    grand += t.amount;
  }
  if (!(grand > 0)) return [];
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total, share: total / grand }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Expenses grouped by category, sorted by total descending. Each group's entries are
 * its expenses, newest `date` first. Income is ignored. Returns [] when there are no expenses.
 */
export function groupByCategory(txs: Transaction[]): CategoryGroup[] {
  const groups = new Map<Category, CategoryGroup>();
  let grand = 0;
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    let group = groups.get(t.category);
    if (!group) {
      group = { category: t.category, total: 0, share: 0, entries: [] };
      groups.set(t.category, group);
    }
    group.total += t.amount;
    group.entries.push(t);
    grand += t.amount;
  }
  if (!(grand > 0)) return [];
  return [...groups.values()]
    .sort((a, b) => b.total - a.total)
    .map((group) => ({
      ...group,
      share: group.total / grand,
      entries: [...group.entries].sort((a, b) => b.date - a.date),
    }));
}
