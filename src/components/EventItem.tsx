import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../constants/theme';
import { confirmAction } from '../lib/confirm';
import type { CalendarEvent } from '../domains/calendar/types';

interface EventItemProps {
  event: CalendarEvent;
  onDelete: (id: string) => void;
}

export function EventItem({ event, onDelete }: EventItemProps) {
  const { colors } = useTheme();

  const handleDelete = async () => {
    const ok = await confirmAction('Delete event', 'This cannot be undone.', 'Delete');
    if (ok) onDelete(event.id);
  };

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => router.push(`/event/${event.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open event ${event.title}`}
        style={styles.main}
      >
        <View style={styles.timeColumn}>
          <Typography variant="caption" secondary>
            {event.time ?? 'All day'}
          </Typography>
        </View>
        <Typography variant="body" style={styles.title} numberOfLines={1}>
          {event.title}
        </Typography>
      </Pressable>
      <Pressable
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete event ${event.title}`}
        style={styles.deleteBtn}
      >
        <Feather name="trash-2" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  timeColumn: {
    width: 64,
  },
  title: {
    flex: 1,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
