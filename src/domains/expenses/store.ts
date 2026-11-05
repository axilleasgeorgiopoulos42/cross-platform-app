import { create } from 'zustand';
import type { Transaction, BalanceSummary } from './types';
import { expenseService } from './service';
import { getDb } from '../../db/client';

interface ExpenseStore {
  transactions: Transaction[];
  balance: BalanceSummary;
  loading: boolean;
  error: string | null;

  loadTransactions(): Promise<void>;
  addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<void>;
  updateTransaction(
    id: string,
    patch: Partial<Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'>>,
  ): Promise<void>;
  fetchTransaction(id: string): Promise<Transaction | null>;
  deleteTransaction(id: string): Promise<void>;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  transactions: [],
  balance: { totalIncome: 0, totalExpenses: 0, balance: 0 },
  loading: false,
  error: null,

  async loadTransactions() {
    set({ loading: true, error: null });
    try {
      const db = await getDb();
      const [transactions, balance] = await Promise.all([
        expenseService.getAll(db),
        expenseService.getBalance(db),
      ]);
      set({ transactions, balance, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  async addTransaction(data) {
    try {
      const db = await getDb();
      await expenseService.create(db, data);
      await get().loadTransactions();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async updateTransaction(id, patch) {
    try {
      const db = await getDb();
      await expenseService.update(db, id, patch);
      await get().loadTransactions();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async fetchTransaction(id: string) {
    try {
      const db = await getDb();
      return await expenseService.getById(db, id);
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  async deleteTransaction(id: string) {
    try {
      const db = await getDb();
      await expenseService.remove(db, id);
      await get().loadTransactions();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
