import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { MONTH_NAMES } from '../constants/months';

interface MonthSwitcherProps {
  year: number;
  month: number;
  onPrev(): void;
  onNext(): void;
}

export function MonthSwitcher({ year, month, onPrev, onNext }: MonthSwitcherProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        hitSlop={8}
        style={styles.iconBtn}
      >
        <Feather name="chevron-left" size={24} color={colors.text} />
      </Pressable>
      <Typography variant="h2" style={styles.title}>
        {MONTH_NAMES[month]} {year}
      </Typography>
      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        hitSlop={8}
        style={styles.iconBtn}
      >
        <Feather name="chevron-right" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
