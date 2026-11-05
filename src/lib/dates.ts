/** Local midnight of the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Local midnight of the day after the one containing `ts` (DST-safe, exclusive end). */
export function startOfNextDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

export function isSameLocalDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** Move a (year, month 0-11) pair by `delta` months, wrapping across years. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const idx = year * 12 + month + delta;
  return { year: Math.floor(idx / 12), month: ((idx % 12) + 12) % 12 };
}

/** Last millisecond of the local day containing `ts`. */
export function endOfDay(ts: number): number {
  return startOfNextDay(ts) - 1;
}

/** Local `YYYY-MM-DD` for `ts`. */
export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${String(d.getFullYear()).padStart(4, '0')}-${mm}-${dd}`;
}

/** Local start of day for a `YYYY-MM-DD` string; null if malformed or not a real date. */
export function fromDateInputValue(s: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date.getTime();
}

/** Local year and month (0-11) of `ts`. */
export function monthOf(ts: number): { year: number; month: number } {
  const d = new Date(ts);
  return { year: d.getFullYear(), month: d.getMonth() };
}
