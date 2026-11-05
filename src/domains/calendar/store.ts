import { create } from 'zustand';
import type { CalendarEvent } from './types';
import { calendarService } from './service';
import { getDb } from '../../db/client';

interface CalendarStore {
  events: CalendarEvent[];
  selectedDate: number | null;
  currentMonth: { year: number; month: number };
  loading: boolean;
  error: string | null;

  loadMonth(year: number, month: number): Promise<void>;
  selectDate(date: number | null): void;
  addEvent(title: string, date: number, time: string | null): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  nextMonth(): void;
  prevMonth(): void;
}

const now = new Date();

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],
  selectedDate: null,
  currentMonth: { year: now.getFullYear(), month: now.getMonth() },
  loading: false,
  error: null,

  async loadMonth(year: number, month: number) {
    set({ loading: true, error: null });
    try {
      const db = await getDb();
      const events = await calendarService.getEventsForMonth(db, year, month);
      set({ events, loading: false, currentMonth: { year, month } });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  selectDate(date: number | null) {
    set({ selectedDate: date });
  },

  async addEvent(title: string, date: number, time: string | null) {
    try {
      const db = await getDb();
      await calendarService.create(db, { title, date, time });
      const { currentMonth } = get();
      await get().loadMonth(currentMonth.year, currentMonth.month);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async deleteEvent(id: string) {
    try {
      const db = await getDb();
      await calendarService.remove(db, id);
      const { currentMonth } = get();
      await get().loadMonth(currentMonth.year, currentMonth.month);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  nextMonth() {
    const { currentMonth } = get();
    let { year, month } = currentMonth;
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    set({ selectedDate: null });
    get().loadMonth(year, month);
  },

  prevMonth() {
    const { currentMonth } = get();
    let { year, month } = currentMonth;
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    set({ selectedDate: null });
    get().loadMonth(year, month);
  },
}));
