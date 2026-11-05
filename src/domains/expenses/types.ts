export type Category =
  | 'food'
  | 'transport'
  | 'bills'
  | 'entertainment'
  | 'health'
  | 'shopping'
  | 'other';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: Category;
  note: string | null;
  date: number;
  createdAt: number;
}

export interface BalanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}
