import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { Modal } from '../../src/components/Modal';
import { MonthSwitcher } from '../../src/components/MonthSwitcher';
import { CategoryBreakdown } from '../../src/components/CategoryBreakdown';
import { TransactionItem } from '../../src/components/TransactionItem';
import {
  TransactionForm,
  type TransactionFormValues,
} from '../../src/components/TransactionForm';
import { useExpenseStore } from '../../src/domains/expenses/store';
import type { Transaction } from '../../src/domains/expenses/types';
import { useSettingsStore } from '../../src/domains/settings/store';
import { categoryBreakdown, filterByMonth, summarize } from '../../src/domains/expenses/summary';
import { shiftMonth } from '../../src/lib/dates';
import { formatMoney } from '../../src/lib/money';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing } from '../../src/constants/theme';

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const currency = useSettingsStore((s) => s.settings.currency);
  const {
    transactions,
    balance,
    loadTransactions,
    addTransaction,
    deleteTransaction,
  } = useExpenseStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const monthTxs = useMemo(
    () => filterByMonth(transactions, view.year, view.month),
    [transactions, view.year, view.month],
  );
  const monthSummary = useMemo(() => summarize(monthTxs), [monthTxs]);
  const breakdown = useMemo(() => categoryBreakdown(monthTxs), [monthTxs]);

  const goPrev = useCallback(
    () => setView((v) => shiftMonth(v.year, v.month, -1)),
    [],
  );
  const goNext = useCallback(
    () => setView((v) => shiftMonth(v.year, v.month, 1)),
    [],
  );

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSave = useCallback(
    async (values: TransactionFormValues) => {
      await addTransaction({ ...values, date: Date.now() });
      setModalVisible(false);
    },
    [addTransaction],
  );

  const handleDelete = useCallback(
    (id: string) => deleteTransaction(id),
    [deleteTransaction],
  );

  const balanceColor = monthSummary.balance < 0 ? colors.destructive : colors.text;

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionItem transaction={item} onDelete={handleDelete} />
    ),
    [handleDelete],
  );

  return (
    <Screen scroll={false}>
      <View style={styles.switcherRow}>
        <MonthSwitcher
          year={view.year}
          month={view.month}
          onPrev={goPrev}
          onNext={goNext}
        />
      </View>

      <FlatList
        data={monthTxs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Card style={styles.balanceCard}>
              <View style={styles.balanceRow}>
                <Typography variant="caption" secondary>Income</Typography>
                <Typography variant="body" style={{ color: colors.success }}>
                  +{formatMoney(Math.abs(monthSummary.totalIncome), currency)}
                </Typography>
              </View>
              <View style={styles.balanceRow}>
                <Typography variant="caption" secondary>Expenses</Typography>
                <Typography variant="body" style={{ color: colors.destructive }}>
                  −{formatMoney(Math.abs(monthSummary.totalExpenses), currency)}
                </Typography>
              </View>
              <View style={[styles.balanceRow, styles.totalRow]}>
                <Typography variant="caption">Net</Typography>
                <Typography variant="h1" style={{ color: balanceColor }}>
                  {formatMoney(monthSummary.balance, currency)}
                </Typography>
              </View>
              <View style={styles.balanceRow}>
                <Typography variant="caption" secondary>All time</Typography>
                <Typography variant="caption" secondary>
                  {formatMoney(balance.balance, currency)}
                </Typography>
              </View>
            </Card>
            <CategoryBreakdown items={breakdown} currency={currency} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState message="No transactions this month" icon="credit-card" />
        }
      />

      <FAB onPress={() => setModalVisible(true)} />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Add Transaction"
      >
        <TransactionForm submitLabel="Save" onSubmit={handleSave} />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceCard: {
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  list: {
    flexGrow: 1,
    paddingBottom: 80,
  },
});
