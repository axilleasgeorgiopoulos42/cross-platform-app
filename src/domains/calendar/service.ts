import type { SQLiteDatabase } from 'expo-sqlite';
import type { CalendarEvent } from './types';

interface EventRow {
  id: string;
  title: string;
  date: number;
  time: string | null;
  notes: string | null;
  created_at: number;
}

function toEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export const calendarService = {
  async getEventsForMonth(
    db: SQLiteDatabase,
    year: number,
    month: number,
  ): Promise<CalendarEvent[]> {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    const rows = await db.getAllAsync<EventRow>(
      'SELECT * FROM events WHERE date >= ? AND date <= ? ORDER BY date, time',
      [start, end],
    );
    return rows.map(toEvent);
  },

  async getEventsForDate(
    db: SQLiteDatabase,
    date: number,
  ): Promise<CalendarEvent[]> {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    const rows = await db.getAllAsync<EventRow>(
      'SELECT * FROM events WHERE date >= ? AND date <= ? ORDER BY time IS NOT NULL, time, title',
      [start, end],
    );
    return rows.map(toEvent);
  },

  async create(
    db: SQLiteDatabase,
    data: { title: string; date: number; time: string | null },
  ): Promise<CalendarEvent> {
    const title = data.title.trim();
    if (!title) throw new Error('Event title cannot be empty');

    const id = crypto.randomUUID();
    const createdAt = Date.now();
    await db.runAsync(
      'INSERT INTO events (id, title, date, time, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, title, data.date, data.time, createdAt],
    );
    return { id, title, date: data.date, time: data.time, notes: null, createdAt };
  },

  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
  },
};
