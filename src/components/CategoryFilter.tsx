import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius } from '../constants/theme';
import type { Category } from '../domains/expenses/types';
import { CATEGORIES } from '../constants/categories';

interface CategoryFilterProps {
  selected: Category | null;
  onSelect: (c: Category | null) => void;
}

type Option = { key: Category | null; label: string; icon: string };

const OPTIONS: readonly Option[] = [{ key: null, label: 'All', icon: 'grid' }, ...CATEGORIES];

/** Horizontal filter chips: "All" (null) followed by every category. Same chip look as CategoryPicker. */
export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {OPTIONS.map((opt) => {
        const isSelected = opt.key === selected;
        const fg = isSelected ? colors.primaryForeground : colors.text;
        return (
          <Pressable
            key={opt.key ?? 'all'}
            onPress={() => onSelect(opt.key)}
            accessibilityRole="button"
            accessibilityLabel={opt.key == null ? 'All categories' : opt.label}
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.chip,
              { backgroundColor: isSelected ? colors.primary : colors.surfaceAlt },
            ]}
          >
            <Feather name={opt.icon as keyof typeof Feather.glyphMap} size={16} color={fg} />
            <Typography variant="caption" style={{ color: fg, marginLeft: spacing.xs }}>
              {opt.label}
            </Typography>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
  },
});
