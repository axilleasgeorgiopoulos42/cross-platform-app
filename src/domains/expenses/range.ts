import { MONTH_NAMES } from '../../constants/months';
import { endOfDay, startOfDay } from '../../lib/dates';

export type RangePreset = 'week' | 'month' | '3months' | 'year' | 'custom';

export interface DateRange {
  preset: RangePreset;
  /** Local start of the first day. */
  from: number;
  /** Last millisecond of the last day. */
  to: number;
}

/** Range of whole months: `months` months starting at the first of (year, month). */
function monthSpan(
  preset: RangePreset,
  year: number,
  month: number,
  months: number,
): DateRange {
  return {
    preset,
    from: new Date(year, month, 1).getTime(),
    to: new Date(year, month + months, 1).getTime() - 1,
  };
}

function weekFrom(startTs: number): DateRange {
  const d = new Date(startTs);
  return {
    preset: 'week',
    from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
    to: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime() - 1,
  };
}

/** Number of calendar days from `from` to `to` inclusive (DST-safe). */
function dayCount(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000) + 1;
}

export function rangeFor(
  preset: Exclude<RangePreset, 'custom'>,
  anchor: number,
): DateRange {
  const d = new Date(anchor);
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (preset) {
    case 'week': {
      const sinceMonday = (d.getDay() + 6) % 7;
      return weekFrom(new Date(y, m, d.getDate() - sinceMonday).getTime());
    }
    case 'month':
      return monthSpan('month', y, m, 1);
    case '3months':
      return monthSpan('3months', y, m - 2, 3);
    case 'year':
      return monthSpan('year', y, 0, 12);
  }
}

export function defaultRange(now: number = Date.now()): DateRange {
  return rangeFor('month', now);
}

export function customRange(from: number, to: number): DateRange {
  return { preset: 'custom', from: startOfDay(from), to: endOfDay(to) };
}

export function shiftRange(range: DateRange, delta: 1 | -1): DateRange {
  const f = new Date(range.from);
  const y = f.getFullYear();
  const m = f.getMonth();
  switch (range.preset) {
    case 'week':
      return weekFrom(new Date(y, m, f.getDate() + 7 * delta).getTime());
    case 'month':
      return monthSpan('month', y, m + delta, 1);
    case '3months':
      return monthSpan('3months', y, m + 3 * delta, 3);
    case 'year':
      return monthSpan('year', y + delta, 0, 12);
    case 'custom': {
      const n = dayCount(range.from, range.to);
      const nf = new Date(y, m, f.getDate() + n * delta).getTime();
      const nt = new Date(y, m, f.getDate() + n * delta + n).getTime() - 1;
      return { preset: 'custom', from: nf, to: nt };
    }
  }
}

export function validateRange(from: number | null, to: number | null): string | null {
  if (from === null || to === null) return 'Choose both a start and an end date.';
  if (startOfDay(from) > startOfDay(to)) return 'The start date must not be after the end date.';
  return null;
}

export function rangeLabel(range: DateRange): string {
  const f = new Date(range.from);
  const t = new Date(range.to);
  const fy = f.getFullYear();
  const ty = t.getFullYear();
  const fm = MONTH_NAMES[f.getMonth()];
  const tm = MONTH_NAMES[t.getMonth()];
  switch (range.preset) {
    case 'month':
      return `${fm} ${fy}`;
    case 'year':
      return `${fy}`;
    case '3months':
      return fy === ty ? `${fm} – ${tm} ${ty}` : `${fm} ${fy} – ${tm} ${ty}`;
    case 'week':
    case 'custom': {
      const start = fy === ty ? `${f.getDate()} ${fm}` : `${f.getDate()} ${fm} ${fy}`;
      return `${start} – ${t.getDate()} ${tm} ${ty}`;
    }
  }
}

export function inRange(range: DateRange, ts: number): boolean {
  return ts >= range.from && ts <= range.to;
}
