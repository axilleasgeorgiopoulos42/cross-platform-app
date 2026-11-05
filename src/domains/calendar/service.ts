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

  async getAll(db: SQLiteDatabase): Promise<CalendarEvent[]> {
    const rows = await db.getAllAsync<EventRow>('SELECT * FROM events ORDER BY date, time');
    return rows.map(toEvent);
  },

  async create(
    db: SQLiteDatabase,
    data: { title: string; date: number; time: string | null; notes?: string | null },
  ): Promise<CalendarEvent> {
    const title = data.title.trim();
    if (!title) throw new Error('Event title cannot be empty');

    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const notes = data.notes ?? null;
    await db.runAsync(
      'INSERT INTO events (id, title, date, time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, data.date, data.time, notes, createdAt],
    );
    return { id, title, date: data.date, time: data.time, notes, createdAt };
  },

  async getById(db: SQLiteDatabase, id: string): Promise<CalendarEvent | null> {
    const row = await db.getFirstAsync<EventRow>('SELECT * FROM events WHERE id = ?', [id]);
    return row ? toEvent(row) : null;
  },

  async update(
    db: SQLiteDatabase,
    id: string,
    patch: { title?: string; date?: number; time?: string | null; notes?: string | null },
  ): Promise<CalendarEvent> {
    const existing = await calendarService.getById(db, id);
    if (!existing) throw new Error('Event not found');

    const title = patch.title !== undefined ? patch.title.trim() : existing.title;
    if (!title) throw new Error('Event title cannot be empty');
    const date = patch.date !== undefined ? patch.date : existing.date;
    const time = patch.time !== undefined ? patch.time : existing.time;
    const notes = patch.notes !== undefined ? patch.notes : existing.notes;

    await db.runAsync(
      'UPDATE events SET title = ?, date = ?, time = ?, notes = ? WHERE id = ?',
      [title, date, time, notes, id],
    );
    return { ...existing, title, date, time, notes };
  },

  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
  },
};
