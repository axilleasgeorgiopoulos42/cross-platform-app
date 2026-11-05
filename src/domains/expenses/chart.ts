import { MONTH_NAMES } from '../../constants/months';
import type { DateRange } from './range';
import type { Transaction } from './types';

export interface Bucket {
  label: string;
  /** Inclusive start (ms). */
  start: number;
  /** Inclusive end (ms): last millisecond of the bucket. */
  end: number;
  total: number;
}

type Granularity = 'day' | 'week' | 'month';

/** Calendar days from `from` to `to` inclusive (DST-safe). */
function calendarDays(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000) + 1;
}

export function bucketGranularity(range: DateRange): Granularity {
  const days = calendarDays(range.from, range.to);
  if (days <= 31) return 'day';
  if (days <= 183) return 'week';
  return 'month';
}

const shortMonth = (m: number): string => MONTH_NAMES[m].slice(0, 3);

/** Start of the bucket following the one beginning at `start`. */
function nextStart(start: number, g: Granularity): number {
  const d = new Date(start);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  switch (g) {
    case 'day':
      return new Date(y, m, day + 1).getTime();
    case 'week': {
      const untilMonday = ((8 - d.getDay()) % 7) || 7;
      return new Date(y, m, day + untilMonday).getTime();
    }
    case 'month':
      return new Date(y, m + 1, 1).getTime();
  }
}

function labelFor(start: number, g: Granularity): string {
  const d = new Date(start);
  switch (g) {
    case 'day':
      return String(d.getDate());
    case 'week':
      return `${d.getDate()} ${shortMonth(d.getMonth())}`;
    case 'month':
      return shortMonth(d.getMonth());
  }
}

export function bucketExpenses(txs: Transaction[], range: DateRange): Bucket[] {
  const g = bucketGranularity(range);
  const buckets: Bucket[] = [];
  let start = range.from;
  while (start <= range.to) {
    const end = Math.min(nextStart(start, g) - 1, range.to);
    buckets.push({ label: labelFor(start, g), start, end, total: 0 });
    start = end + 1;
  }

  for (const t of txs) {
    if (t.type !== 'expense' || t.date < range.from || t.date > range.to) continue;
    // Binary search for the bucket containing t.date.
    let lo = 0;
    let hi = buckets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (buckets[mid].start <= t.date) lo = mid;
      else hi = mid - 1;
    }
    buckets[lo].total += t.amount;
  }
  return buckets;
}

/** Indexes of the axis labels to show: at most `max`, always including 0, evenly spread. */
export function visibleLabelIndexes(count: number, max: number = 6): number[] {
  if (count <= 0) return [];
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  if (max <= 1) return [0];
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(Math.round((i * (count - 1)) / (max - 1)));
  return out;
}
