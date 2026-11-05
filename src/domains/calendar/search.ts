import type { CalendarEvent } from './types';
import { matchesQuery } from '../../lib/text';

export function searchEvents(events: CalendarEvent[], query: string): CalendarEvent[] {
  if (!query.trim()) return [];
  return events
    .filter((e) => matchesQuery([e.title, e.notes], query))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date - b.date;
      if (a.time === b.time) return 0;
      if (a.time === null) return -1;
      if (b.time === null) return 1;
      return a.time < b.time ? -1 : 1;
    });
}
