import {
  customRange,
  defaultRange,
  inRange,
  rangeFor,
  rangeLabel,
  shiftRange,
  validateRange,
} from '../../src/domains/expenses/range';

const day = (y: number, m: number, d: number) => new Date(y, m, d).getTime();
const endOf = (y: number, m: number, d: number) => new Date(y, m, d + 1).getTime() - 1;

describe('range model', () => {
  test('defaultRange is the month containing now', () => {
    expect(defaultRange(day(2026, 10, 15))).toEqual({
      preset: 'month',
      from: day(2026, 10, 1),
      to: endOf(2026, 10, 30),
    });
  });

  test('rangeFor week starts on Monday', () => {
    const r = rangeFor('week', day(2026, 10, 4));
    expect(r).toEqual({ preset: 'week', from: day(2026, 10, 2), to: endOf(2026, 10, 8) });
  });

  test('rangeFor week on a Sunday belongs to the week ending that day', () => {
    const r = rangeFor('week', day(2026, 10, 8));
    expect(r.from).toBe(day(2026, 10, 2));
    expect(r.to).toBe(endOf(2026, 10, 8));
  });

  test('rangeFor 3months and year', () => {
    expect(rangeFor('3months', day(2026, 10, 15))).toEqual({
      preset: '3months',
      from: day(2026, 8, 1),
      to: endOf(2026, 10, 30),
    });
    expect(rangeFor('year', day(2026, 10, 15))).toEqual({
      preset: 'year',
      from: day(2026, 0, 1),
      to: endOf(2026, 11, 31),
    });
  });

  test('shiftRange month across years', () => {
    const dec = rangeFor('month', day(2026, 11, 10));
    const jan = shiftRange(dec, 1);
    expect(jan.from).toBe(day(2027, 0, 1));
    expect(jan.to).toBe(endOf(2027, 0, 31));
    expect(shiftRange(jan, -1)).toEqual(dec);
    expect(shiftRange(jan, 1).to).toBe(endOf(2027, 1, 28));
  });

  test('shiftRange week, 3months, year', () => {
    const w = shiftRange(rangeFor('week', day(2026, 10, 4)), 1);
    expect(w.from).toBe(day(2026, 10, 9));
    expect(w.to).toBe(endOf(2026, 10, 15));
    const q = shiftRange(rangeFor('3months', day(2026, 10, 15)), 1);
    expect(q.from).toBe(day(2026, 11, 1));
    expect(q.to).toBe(endOf(2027, 1, 28));
    const y = shiftRange(rangeFor('year', day(2026, 10, 15)), -1);
    expect(y.from).toBe(day(2025, 0, 1));
    expect(y.to).toBe(endOf(2025, 11, 31));
  });

  test('shiftRange custom moves by its day count', () => {
    const c = customRange(day(2026, 10, 10), endOf(2026, 10, 12));
    const next = shiftRange(c, 1);
    expect(next).toEqual({ preset: 'custom', from: day(2026, 10, 13), to: endOf(2026, 10, 15) });
    const prev = shiftRange(c, -1);
    expect(prev).toEqual({ preset: 'custom', from: day(2026, 10, 7), to: endOf(2026, 10, 9) });
  });

  test('customRange normalizes to day boundaries', () => {
    const c = customRange(day(2026, 10, 10) + 5000, day(2026, 10, 12) + 5000);
    expect(c.from).toBe(day(2026, 10, 10));
    expect(c.to).toBe(endOf(2026, 10, 12));
  });

  test('validateRange', () => {
    const a = day(2026, 10, 1);
    const b = day(2026, 10, 5);
    expect(typeof validateRange(null, b)).toBe('string');
    expect(typeof validateRange(a, null)).toBe('string');
    expect(typeof validateRange(b, a)).toBe('string');
    expect(validateRange(a, a)).toBeNull();
    expect(validateRange(a, b)).toBeNull();
  });

  test('validateRange rejects dates before 1900 and accepts 1900-01-01', () => {
    const b = day(2026, 10, 5);
    const early = new Date(202, 0, 1);
    early.setFullYear(202);
    expect(typeof validateRange(early.getTime(), b)).toBe('string');
    expect(typeof validateRange(day(1900, 0, 1), early.getTime())).toBe('string');
    expect(validateRange(day(1900, 0, 1), b)).toBeNull();
    expect(typeof validateRange(day(1899, 11, 31), b)).toBe('string');
  });

  test('rangeLabel', () => {
    expect(rangeLabel(rangeFor('month', day(2026, 10, 15)))).toBe('November 2026');
    expect(rangeLabel(rangeFor('year', day(2026, 10, 15)))).toBe('2026');
    const w = rangeLabel(rangeFor('week', day(2026, 10, 4)));
    expect(w).toContain('2026');
    expect(w).toContain('November');
    const q = rangeLabel(rangeFor('3months', day(2026, 10, 15)));
    expect(q).toContain('2026');
    expect(q).toContain('September');
    expect(q).toContain('November');
    const c = rangeLabel(customRange(day(2026, 9, 28), day(2026, 10, 3)));
    expect(c).toContain('2026');
    expect(c).toContain('October');
    expect(c).toContain('November');
  });

  test('inRange is inclusive at both ends', () => {
    const r = rangeFor('month', day(2026, 10, 15));
    expect(inRange(r, r.from)).toBe(true);
    expect(inRange(r, r.to)).toBe(true);
    expect(inRange(r, r.from - 1)).toBe(false);
    expect(inRange(r, r.to + 1)).toBe(false);
  });
});
