import type { BalanceSummary, Category, Transaction } from './types';

export interface CategoryShare {
  category: Category;
  total: number;
  share: number;
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
