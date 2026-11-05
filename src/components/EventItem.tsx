import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../constants/theme';
import type { CalendarEvent } from '../domains/calendar/types';

interface EventItemProps {
  event: CalendarEvent;
  onDelete: (id: string) => void;
}

export function EventItem({ event, onDelete }: EventItemProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.timeColumn}>
        <Typography variant="caption" secondary>
          {event.time ?? 'All day'}
        </Typography>
      </View>
      <Typography variant="body" style={styles.title} numberOfLines={1}>
        {event.title}
      </Typography>
      <Pressable
        onPress={() => onDelete(event.id)}
        hitSlop={8}
        style={styles.deleteBtn}
      >
        <Feather
          name="trash-2"
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeColumn: {
    width: 64,
  },
  title: {
    flex: 1,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
});
