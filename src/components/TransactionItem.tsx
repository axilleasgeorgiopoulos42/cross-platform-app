import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from './Card';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../constants/theme';
import type { Transaction } from '../domains/expenses/types';
import { CATEGORIES, INCOME_ICON } from '../constants/categories';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

export function TransactionItem({ transaction, onDelete }: TransactionItemProps) {
  const { colors } = useTheme();

  const icon =
    transaction.type === 'income'
      ? INCOME_ICON
      : (CATEGORIES.find((c) => c.key === transaction.category)?.icon ?? 'more-horizontal');

  const categoryLabel =
    transaction.type === 'income'
      ? 'Income'
      : (CATEGORIES.find((c) => c.key === transaction.category)?.label ?? transaction.category);

  const amountColor = transaction.type === 'income' ? colors.success : colors.destructive;
  const amountPrefix = transaction.type === 'income' ? '+' : '−';
  const dateStr = new Date(transaction.date).toLocaleDateString('en-GB');

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconCol}>
          <Feather
            name={icon as keyof typeof Feather.glyphMap}
            size={20}
            color={colors.textSecondary}
          />
          <Typography variant="caption" secondary>
            {categoryLabel}
          </Typography>
        </View>

        <View style={styles.center}>
          {transaction.note ? (
            <Typography variant="body" numberOfLines={1}>
              {transaction.note}
            </Typography>
          ) : null}
          <Typography variant="caption" secondary>
            {dateStr}
          </Typography>
        </View>

        <Typography variant="body" style={{ color: amountColor }}>
          {amountPrefix}{transaction.amount.toFixed(2)}
        </Typography>

        <Pressable
          onPress={() => onDelete(transaction.id)}
          hitSlop={8}
          style={styles.deleteBtn}
        >
          <Feather name="trash-2" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  iconCol: {
    alignItems: 'center',
    width: 56,
  },
  center: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  deleteBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
