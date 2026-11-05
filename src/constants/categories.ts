import type { Category } from '../domains/expenses/types';

export const CATEGORIES: ReadonlyArray<{
  key: Category;
  label: string;
  icon: string;
}> = [
  { key: 'food', label: 'Food', icon: 'coffee' },
  { key: 'transport', label: 'Transport', icon: 'navigation' },
  { key: 'bills', label: 'Bills', icon: 'file-text' },
  { key: 'entertainment', label: 'Entertainment', icon: 'music' },
  { key: 'health', label: 'Health', icon: 'heart' },
  { key: 'shopping', label: 'Shopping', icon: 'shopping-bag' },
  { key: 'other', label: 'Other', icon: 'more-horizontal' },
];

export const INCOME_ICON = 'dollar-sign';
