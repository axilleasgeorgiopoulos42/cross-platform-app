import {
  startOfDay,
  startOfNextDay,
  isSameLocalDay,
  toDateInputValue,
  fromDateInputValue,
  endOfDay,
  monthOf,
} from '../../src/lib/dates';

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

describe('shiftMonth', () => {
  const { shiftMonth } = require('../../src/lib/dates');
  it('wraps Dec to Jan of next year', () => {
    expect(shiftMonth(2025, 11, 1)).toEqual({ year: 2026, month: 0 });
  });
  it('wraps Jan to Dec of previous year', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
  it('handles +/-12 months', () => {
    expect(shiftMonth(2026, 4, 12)).toEqual({ year: 2027, month: 4 });
    expect(shiftMonth(2026, 4, -12)).toEqual({ year: 2025, month: 4 });
  });
  it('moves within a year', () => {
    expect(shiftMonth(2026, 4, 1)).toEqual({ year: 2026, month: 5 });
  });
});

describe('date input helpers', () => {
  it('formats a local timestamp as zero-padded YYYY-MM-DD', () => {
    expect(toDateInputValue(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });

  it('parses a valid value to local start of day', () => {
    expect(fromDateInputValue('2026-03-08')).toBe(new Date(2026, 2, 8).getTime());
    expect(fromDateInputValue('2024-02-29')).toBe(new Date(2024, 1, 29).getTime());
  });

  it('returns null for empty, malformed or non-existent dates', () => {
    for (const bad of ['2025-02-29', '2026-02-31', '2026-13-01', '2026-1-5', '', 'abc']) {
      expect(fromDateInputValue(bad)).toBeNull();
    }
  });

  it('round-trips and ends the day correctly across DST changes', () => {
    for (const month of [2, 9]) {
      const start = new Date(2026, month, lastSunday(2026, month)).getTime();
      expect(fromDateInputValue(toDateInputValue(start))).toBe(start);
      expect(endOfDay(start) + 1).toBe(startOfNextDay(start));
    }
  });

  it('monthOf returns the local year and month', () => {
    expect(monthOf(new Date(2026, 11, 31, 23, 59).getTime())).toEqual({ year: 2026, month: 11 });
  });
});
