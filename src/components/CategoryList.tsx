import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { TransactionItem } from './TransactionItem';
import { categoryRowLabel } from './categoryRowLabel';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES, INCOME_ICON } from '../constants/categories';
import type { Currency } from '../constants/currencies';
import type { Category, Transaction } from '../domains/expenses/types';
import type { CategoryGroup } from '../domains/expenses/summary';
import { formatMoney } from '../lib/money';
import { radius, spacing } from '../constants/theme';

interface CategoryListProps {
  groups: CategoryGroup[];
  /** Income entries in the range (newest first); renders an expandable Income row when non-empty. */
  income?: { entries: Transaction[]; total: number };
  currency: Currency;
  onDelete: (id: string) => void;
}

export function CategoryList({ groups, income, currency, onDelete }: CategoryListProps) {
  const { colors } = useTheme();
  // Keyed by category (not index); pruned below when a group disappears.
  const [expanded, setExpanded] = useState<Set<Category>>(() => new Set());

  // Drop expansion for categories whose group vanished, so they reappear collapsed.
  const stale = [...expanded].filter((c) => !groups.some((g) => g.category === c));
  if (stale.length > 0) {
    setExpanded(new Set([...expanded].filter((c) => !stale.includes(c))));
  }

  const incomeCount = income?.entries.length ?? 0;
  const [incomeOpen, setIncomeOpen] = useState(false);
  // Reset the Income section when its entries vanish, so it reappears collapsed.
  if (incomeCount === 0 && incomeOpen) setIncomeOpen(false);

  if (groups.length === 0 && incomeCount === 0) return null;

  const toggle = (category: Category) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  return (
    <View style={styles.wrap}>
      {groups.map((group) => {
        const meta = CATEGORIES.find((c) => c.key === group.category);
        const label = meta?.label ?? group.category;
        const pct = Math.min(100, Math.max(0, group.share * 100));
        const isOpen = expanded.has(group.category);
        return (
          <View key={group.category}>
            <Pressable
              onPress={() => toggle(group.category)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={categoryRowLabel(
                label,
                group.total,
                group.entries.length,
                currency,
              )}
              style={styles.row}
            >
              <Feather
                name={(meta?.icon ?? 'more-horizontal') as keyof typeof Feather.glyphMap}
                size={18}
                color={colors.textSecondary}
              />
              <View style={styles.middle}>
                <Typography variant="caption">{label}</Typography>
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
                {formatMoney(group.total, currency)}
              </Typography>
              <Feather
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
            {isOpen &&
              group.entries.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} onDelete={onDelete} />
              ))}
          </View>
        );
      })}
      {income && incomeCount > 0 && (
        <View>
          <Pressable
            onPress={() => setIncomeOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: incomeOpen }}
            accessibilityLabel={categoryRowLabel('Income', income.total, incomeCount, currency)}
            style={styles.row}
          >
            <Feather
              name={INCOME_ICON as keyof typeof Feather.glyphMap}
              size={18}
              color={colors.textSecondary}
            />
            <View style={styles.middle}>
              <Typography variant="caption">Income</Typography>
            </View>
            <Typography variant="caption" style={styles.amount}>
              {formatMoney(income.total, currency)}
            </Typography>
            <Feather
              name={incomeOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
          {incomeOpen &&
            income.entries.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} onDelete={onDelete} />
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  middle: { flex: 1, gap: spacing.xs },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  bar: { height: 8, borderRadius: radius.full, maxWidth: '100%' },
  amount: { minWidth: 72, textAlign: 'right' },
});
