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

  async getById(db: SQLiteDatabase, id: string): Promise<Transaction | null> {
    const row = await db.getFirstAsync<TransactionRow>(
      'SELECT * FROM transactions WHERE id = ?',
      [id],
    );
    return row ? toTransaction(row) : null;
  },

  async update(
    db: SQLiteDatabase,
    id: string,
    patch: Partial<Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'>>,
  ): Promise<Transaction> {
    const existing = await expenseService.getById(db, id);
    if (!existing) throw new Error('Transaction not found');

    const merged: Transaction = {
      ...existing,
      type: patch.type !== undefined ? patch.type : existing.type,
      amount: patch.amount !== undefined ? patch.amount : existing.amount,
      category: patch.category !== undefined ? patch.category : existing.category,
      note: patch.note !== undefined ? patch.note : existing.note,
      date: patch.date !== undefined ? patch.date : existing.date,
    };
    if (!(merged.amount > 0)) throw new Error('Amount must be greater than 0');

    await db.runAsync(
      'UPDATE transactions SET type = ?, amount = ?, category = ?, note = ?, date = ? WHERE id = ?',
      [merged.type, merged.amount, merged.category, merged.note, merged.date, id],
    );
    return merged;
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
