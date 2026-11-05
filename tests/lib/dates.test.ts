import { startOfDay, startOfNextDay, isSameLocalDay } from '../../src/lib/dates';

// Last Sunday of March and October: a local day may be 23h or 25h in DST zones.
function lastSunday(year: number, month: number): number {
  const d = new Date(year, month + 1, 0);
  return d.getDate() - d.getDay();
}

describe('dates', () => {
  it('startOfDay returns local midnight', () => {
    const ts = new Date(2026, 5, 10, 15, 30, 12).getTime();
    expect(startOfDay(ts)).toBe(new Date(2026, 5, 10).getTime());
  });

  it('startOfNextDay is the next local midnight', () => {
    const ts = new Date(2026, 5, 10, 15).getTime();
    expect(startOfNextDay(ts)).toBe(new Date(2026, 5, 11).getTime());
  });

  it('isSameLocalDay compares local days', () => {
    const a = new Date(2026, 5, 10, 0, 0, 0).getTime();
    const b = new Date(2026, 5, 10, 23, 59, 59, 999).getTime();
    const c = new Date(2026, 5, 11, 0, 0, 0).getTime();
    expect(isSameLocalDay(a, b)).toBe(true);
    expect(isSameLocalDay(b, c)).toBe(false);
  });

  it.each([2, 9])('handles DST transition day (month %i)', (month) => {
    const day = lastSunday(2026, month);
    const start = new Date(2026, month, day).getTime();
    const next = new Date(2026, month, day + 1).getTime();
    const late = new Date(2026, month, day, 23, 59, 59, 999).getTime();
    expect(startOfDay(late)).toBe(start);
    expect(startOfNextDay(start)).toBe(next);
    expect(isSameLocalDay(start, late)).toBe(true);
    expect(isSameLocalDay(late, next)).toBe(false);
    expect(isSameLocalDay(next - 1, start)).toBe(true);
  });
});
