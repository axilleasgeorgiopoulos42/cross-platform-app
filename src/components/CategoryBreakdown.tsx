import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../constants/categories';
import type { Currency } from '../constants/currencies';
import type { Category } from '../domains/expenses/types';
import { formatMoney } from '../lib/money';
import { radius, spacing } from '../constants/theme';

interface CategoryBreakdownProps {
  items: { category: Category; total: number; share: number }[];
  currency: Currency;
}

export function CategoryBreakdown({ items, currency }: CategoryBreakdownProps) {
  const { colors } = useTheme();
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const meta = CATEGORIES.find((c) => c.key === item.category);
        const pct = Math.min(100, Math.max(0, item.share * 100));
        return (
          <View key={item.category} style={styles.row}>
            <Feather
              name={(meta?.icon ?? 'more-horizontal') as keyof typeof Feather.glyphMap}
              size={18}
              color={colors.textSecondary}
            />
            <View style={styles.middle}>
              <Typography variant="caption">{meta?.label ?? item.category}</Typography>
              <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: colors.primary,
                      width: `${pct}%`,
                      minWidth: pct > 0 ? 4 : 0,
                    },
                  ]}
                />
              </View>
            </View>
            <Typography variant="caption" style={styles.amount}>
              {formatMoney(item.total, currency)}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  middle: { flex: 1, gap: spacing.xs },
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bar: { height: 8, borderRadius: radius.full, maxWidth: '100%' },
  amount: { minWidth: 72, textAlign: 'right' },
});
