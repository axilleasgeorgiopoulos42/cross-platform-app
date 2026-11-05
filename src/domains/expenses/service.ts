import type { SQLiteDatabase } from 'expo-sqlite';
import type { Transaction, BalanceSummary } from './types';

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  category: string;
  note: string | null;
  date: number;
  created_at: number;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as Transaction['type'],
    amount: row.amount,
    category: row.category as Transaction['category'],
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
  };
}

export const expenseService = {
  async getAll(db: SQLiteDatabase): Promise<Transaction[]> {
    const rows = await db.getAllAsync<TransactionRow>(
      'SELECT * FROM transactions ORDER BY date DESC',
    );
    return rows.map(toTransaction);
  },

  async create(
    db: SQLiteDatabase,
    data: Omit<Transaction, 'id' | 'createdAt'>,
  ): Promise<Transaction> {
    if (data.amount <= 0) throw new Error('Amount must be greater than 0');

    const id = crypto.randomUUID();
    const createdAt = Date.now();
    await db.runAsync(
      'INSERT INTO transactions (id, type, amount, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.type, data.amount, data.category, data.note, data.date, createdAt],
    );
    return { id, ...data, createdAt };
  },

  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  },

  async getBalance(db: SQLiteDatabase): Promise<BalanceSummary> {
    const rows = await db.getAllAsync<{ type: string; total: number }>(
      'SELECT type, SUM(amount) as total FROM transactions GROUP BY type',
    );
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const row of rows) {
      if (row.type === 'income') totalIncome = row.total;
      else if (row.type === 'expense') totalExpenses = row.total;
    }
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  },
};
