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
