import { StyleSheet, View } from 'react-native';
import { Typography } from './Typography';
import { DayCell } from './DayCell';
import type { CalendarEvent } from '../domains/calendar/types';
import { spacing } from '../constants/theme';

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  selectedDate: number | null;
  onSelectDate: (date: number) => void;
  today: number;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CellData {
  day: number;
  timestamp: number;
  isCurrentMonth: boolean;
}

function buildGrid(year: number, month: number): CellData[] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells: CellData[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    cells.push({
      day,
      timestamp: new Date(year, month - 1, day).getTime(),
      isCurrentMonth: false,
    });
  }

  // Current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      timestamp: new Date(year, month, d).getTime(),
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill 42 cells (6 rows)
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({
      day: nextDay,
      timestamp: new Date(year, month + 1, nextDay).getTime(),
      isCurrentMonth: false,
    });
    nextDay++;
  }

  return cells;
}

export function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  today,
}: CalendarGridProps) {
  const cells = buildGrid(year, month);

  const eventDates = new Set(
    events.map((e) => {
      const d = new Date(e.date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }),
  );

  const rows: CellData[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((wd) => (
          <View key={wd} style={styles.weekdayCell}>
            <Typography variant="caption" secondary>
              {wd}
            </Typography>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((cell) => (
            <DayCell
              key={cell.timestamp}
              day={cell.day}
              isCurrentMonth={cell.isCurrentMonth}
              isToday={cell.timestamp === today}
              isSelected={cell.timestamp === selectedDate}
              hasEvents={eventDates.has(cell.timestamp)}
              onPress={() => onSelectDate(cell.timestamp)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
  },
});
