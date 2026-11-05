import { createTestDb } from '../helpers/testDb';
import { runMigrations } from '../../src/db/migrations';
import { calendarService } from '../../src/domains/calendar/service';

async function setup() {
  const db = await createTestDb();
  await runMigrations(db);
  return db;
}

const DATE = new Date(2026, 10, 5).getTime();

describe('calendarService edits', () => {
  it('create stores notes', async () => {
    const db = await setup();
    const ev = await calendarService.create(db, { title: 'A', date: DATE, time: '10:00', notes: 'bring docs' });
    expect(ev.notes).toBe('bring docs');
    expect((await calendarService.getById(db, ev.id))?.notes).toBe('bring docs');
  });

  it('create without notes defaults to null', async () => {
    const db = await setup();
    const ev = await calendarService.create(db, { title: 'A', date: DATE, time: null });
    expect(ev.notes).toBeNull();
  });

  it('update changes title, time and notes', async () => {
    const db = await setup();
    const ev = await calendarService.create(db, { title: 'A', date: DATE, time: '10:00' });
    const out = await calendarService.update(db, ev.id, { title: '  B  ', time: '11:30', notes: 'n' });
    expect(out).toMatchObject({ id: ev.id, title: 'B', time: '11:30', notes: 'n', date: DATE });
    expect(await calendarService.getById(db, ev.id)).toEqual(out);
  });

  it('update with time null clears time', async () => {
    const db = await setup();
    const ev = await calendarService.create(db, { title: 'A', date: DATE, time: '10:00' });
    const out = await calendarService.update(db, ev.id, { time: null });
    expect(out.time).toBeNull();
    expect(out.title).toBe('A');
  });

  it('update rejects blank title', async () => {
    const db = await setup();
    const ev = await calendarService.create(db, { title: 'A', date: DATE, time: null });
    await expect(calendarService.update(db, ev.id, { title: '   ' })).rejects.toThrow('Event title cannot be empty');
    expect((await calendarService.getById(db, ev.id))?.title).toBe('A');
  });

  it('update on unknown id throws Event not found', async () => {
    const db = await setup();
    await expect(calendarService.update(db, 'nope', { title: 'X' })).rejects.toThrow('Event not found');
  });

  it('getById returns null for unknown id', async () => {
    const db = await setup();
    expect(await calendarService.getById(db, 'nope')).toBeNull();
  });
});
