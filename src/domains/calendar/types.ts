export interface CalendarEvent {
  id: string;
  title: string;
  date: number;
  time: string | null;
  notes: string | null;
  createdAt: number;
}
