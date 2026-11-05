import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius } from '../constants/theme';
import type { Category } from '../domains/expenses/types';
import { CATEGORIES } from '../constants/categories';

interface CategoryPickerProps {
  selected: Category;
  onSelect: (cat: Category) => void;
  type: 'income' | 'expense';
}

export function CategoryPicker({ selected, onSelect, type }: CategoryPickerProps) {
  const { colors } = useTheme();

  const items = type === 'income'
    ? CATEGORIES.filter((c) => c.key === 'other')
    : CATEGORIES;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((cat) => {
        const isSelected = cat.key === selected;
        return (
          <Pressable
            key={cat.key}
            onPress={() => onSelect(cat.key)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
              },
            ]}
          >
            <Feather
              name={cat.icon as keyof typeof Feather.glyphMap}
              size={16}
              color={isSelected ? colors.primaryForeground : colors.text}
            />
            <Typography
              variant="caption"
              style={{
                color: isSelected ? colors.primaryForeground : colors.text,
                marginLeft: spacing.xs,
              }}
            >
              {cat.label}
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
    height: 40,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
  },
});
