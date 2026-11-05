jest.mock('../../src/db/client', () => ({ getDb: jest.fn() }));

import { getDb } from '../../src/db/client';
import { createTestDb } from '../helpers/testDb';
import { runMigrations } from '../../src/db/migrations';
import { useCalendarStore } from '../../src/domains/calendar/store';
import { calendarService } from '../../src/domains/calendar/service';
import { searchEvents } from '../../src/domains/calendar/search';
import type { CalendarEvent } from '../../src/domains/calendar/types';

function ev(over: Partial<CalendarEvent>): CalendarEvent {
  return { id: 'x', title: 't', date: 0, time: null, notes: null, createdAt: 0, ...over };
}

describe('searchEvents', () => {
  it('matches title and notes case-insensitively', () => {
    const a = ev({ id: 'a', title: 'Dentist' });
    const b = ev({ id: 'b', title: 'Other', notes: 'bring DENTIST card' });
    const c = ev({ id: 'c', title: 'Nope' });
    expect(searchEvents([a, b, c], 'dentist').map((e) => e.id).sort()).toEqual(['a', 'b']);
  });

  it('returns [] for empty or whitespace query', () => {
    expect(searchEvents([ev({})], '')).toEqual([]);
    expect(searchEvents([ev({})], '   ')).toEqual([]);
  });

  it('sorts by date then time with all-day first', () => {
    const late = ev({ id: 'late', title: 'm', date: 2, time: '10:00' });
    const early = ev({ id: 'early', title: 'm', date: 2, time: '08:00' });
    const allDay = ev({ id: 'allday', title: 'm', date: 2, time: null });
    const first = ev({ id: 'first', title: 'm', date: 1, time: '23:00' });
    expect(searchEvents([late, early, allDay, first], 'm').map((e) => e.id)).toEqual([
      'first',
      'allday',
      'early',
      'late',
    ]);
  });

  it('matches a Greek title with an accent-less query', () => {
    const e = ev({ title: 'Καφές με φίλους' });
    expect(searchEvents([e], 'καφες')).toHaveLength(1);
  });
});

describe('calendar store: allEvents', () => {
  beforeEach(async () => {
    const db = await createTestDb();
    await runMigrations(db);
    (getDb as jest.Mock).mockResolvedValue(db);
    useCalendarStore.setState({
      events: [],
      todayEvents: [],
      allEvents: [],
      selectedDate: null,
      currentMonth: { year: 2020, month: 2 },
      error: null,
    });
  });

  it('loadAllForSearch loads events from all months', async () => {
    const db = await getDb();
    await calendarService.create(db, { title: 'March', date: new Date(2020, 2, 10).getTime(), time: null });
    await calendarService.create(db, { title: 'July', date: new Date(2020, 6, 10).getTime(), time: null });
    await useCalendarStore.getState().loadAllForSearch();
    expect(useCalendarStore.getState().allEvents.map((e) => e.title)).toEqual(['March', 'July']);
  });

  it('updateEvent and deleteEvent keep allEvents fresh outside the current month', async () => {
    const db = await getDb();
    const created = await calendarService.create(db, {
      title: 'Moving',
      date: new Date(2020, 2, 10).getTime(),
      time: null,
    });
    await useCalendarStore.getState().loadAllForSearch();
    const newDate = new Date(2020, 8, 5).getTime();
    await useCalendarStore.getState().updateEvent(created.id, { date: newDate });
    const found = useCalendarStore.getState().allEvents.find((e) => e.id === created.id);
    expect(found?.date).toBe(newDate);

    await useCalendarStore.getState().deleteEvent(created.id);
    expect(useCalendarStore.getState().allEvents.find((e) => e.id === created.id)).toBeUndefined();
  });
});
