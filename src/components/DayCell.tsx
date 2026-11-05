import { Pressable, StyleSheet, View } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../constants/theme';

interface DayCellProps {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean;
  onPress: () => void;
}

export function DayCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  hasEvents,
  onPress,
}: DayCellProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        isSelected && { backgroundColor: colors.primary + '26' },
      ]}
    >
      <Typography
        variant="body"
        style={[
          styles.dayText,
          isToday && { fontWeight: '600' },
          !isCurrentMonth && { opacity: 0.3 },
          isSelected && { color: colors.primary },
        ]}
      >
        {day}
      </Typography>
      {hasEvents && (
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minHeight: 44,
  },
  dayText: {
    textAlign: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});
