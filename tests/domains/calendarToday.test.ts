jest.mock('../../src/db/client', () => ({ getDb: jest.fn() }));

import { getDb } from '../../src/db/client';
import { createTestDb } from '../helpers/testDb';
import { runMigrations } from '../../src/db/migrations';
import { useCalendarStore } from '../../src/domains/calendar/store';
import { startOfDay } from '../../src/lib/dates';

describe('calendar store: todayEvents', () => {
  beforeEach(async () => {
    const db = await createTestDb();
    await runMigrations(db);
    (getDb as jest.Mock).mockResolvedValue(db);
    useCalendarStore.setState({
      events: [],
      todayEvents: [],
      selectedDate: null,
      error: null,
    });
  });

  it('loadToday fills todayEvents with only today and leaves currentMonth alone', async () => {
    const today = startOfDay(Date.now());
    const store = useCalendarStore.getState();
    await store.addEvent('Today thing', today, null);
    await store.addEvent('Old thing', new Date(2020, 2, 10).getTime(), null);

    await useCalendarStore.getState().loadMonth(2020, 2);
    await useCalendarStore.getState().loadToday();

    const s = useCalendarStore.getState();
    expect(s.currentMonth).toEqual({ year: 2020, month: 2 });
    expect(s.events.map((e) => e.title)).toEqual(['Old thing']);
    expect(s.todayEvents.map((e) => e.title)).toEqual(['Today thing']);
  });

  it('addEvent for today adds it to todayEvents', async () => {
    const today = startOfDay(Date.now());
    await useCalendarStore.getState().loadMonth(2020, 2);
    await useCalendarStore.getState().addEvent('Quick add', today, null);
    expect(useCalendarStore.getState().todayEvents.map((e) => e.title)).toEqual(['Quick add']);
    expect(useCalendarStore.getState().currentMonth).toEqual({ year: 2020, month: 2 });
  });

  it('deleteEvent removes it from todayEvents', async () => {
    const today = startOfDay(Date.now());
    await useCalendarStore.getState().addEvent('Gone soon', today, null);
    const id = useCalendarStore.getState().todayEvents[0].id;
    await useCalendarStore.getState().deleteEvent(id);
    expect(useCalendarStore.getState().todayEvents).toEqual([]);
  });

  it('updateEvent refreshes todayEvents', async () => {
    const today = startOfDay(Date.now());
    await useCalendarStore.getState().addEvent('Before', today, null);
    const id = useCalendarStore.getState().todayEvents[0].id;
    await useCalendarStore.getState().updateEvent(id, { title: 'After' });
    expect(useCalendarStore.getState().todayEvents.map((e) => e.title)).toEqual(['After']);
  });
});
