import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { Modal } from '../../src/components/Modal';
import { MonthSwitcher } from '../../src/components/MonthSwitcher';
import { SearchBar } from '../../src/components/SearchBar';
import { CategoryFilter } from '../../src/components/CategoryFilter';
import { DateField } from '../../src/components/DateField';
import { CategoryBreakdown } from '../../src/components/CategoryBreakdown';
import { TransactionItem } from '../../src/components/TransactionItem';
import {
  TransactionForm,
  type TransactionFormValues,
} from '../../src/components/TransactionForm';
import { useExpenseStore } from '../../src/domains/expenses/store';
import type { Transaction } from '../../src/domains/expenses/types';
import {
  EMPTY_FILTER,
  filterTransactions,
  isFilterActive,
  type TransactionFilter,
} from '../../src/domains/expenses/search';
import { useSettingsStore } from '../../src/domains/settings/store';
import { categoryBreakdown, filterByMonth, summarize } from '../../src/domains/expenses/summary';
import { monthOf, shiftMonth } from '../../src/lib/dates';
import { formatMoney } from '../../src/lib/money';
import { useTodayStart } from '../../src/hooks/useTodayStart';
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

  const dayStart = useTodayStart();
  const [modalVisible, setModalVisible] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
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

  const filtering = isFilterActive(filter);
  const results = useMemo(
    () => (filtering ? filterTransactions(transactions, filter) : []),
    [filtering, transactions, filter],
  );
  const resultSummary = useMemo(() => summarize(results), [results]);

  const toggleFilter = useCallback(() => {
    if (filterOpen) {
      setFilterOpen(false);
      setFilter(EMPTY_FILTER);
    } else {
      setFilterOpen(true);
    }
  }, [filterOpen]);

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
      useExpenseStore.setState({ error: null });
      await addTransaction(values);
      if (useExpenseStore.getState().error === null) {
        // Show the month of the new transaction so it is visible.
        setView(monthOf(values.date));
      }
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
        {filtering ? (
          <View style={styles.spacer} />
        ) : (
          <MonthSwitcher
            year={view.year}
            month={view.month}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}
        <Pressable
          onPress={toggleFilter}
          accessibilityRole="button"
          accessibilityLabel="Search transactions"
          style={styles.iconBtn}
        >
          <Feather
            name="search"
            size={20}
            color={filterOpen ? colors.primary : colors.textSecondary}
          />
        </Pressable>
      </View>

      {filterOpen && (
        <View style={styles.filterPanel}>
          <SearchBar
            value={filter.query}
            onChangeText={(query) => setFilter((f) => ({ ...f, query }))}
            placeholder="Search notes and categories"
            autoFocus
          />
          <CategoryFilter
            selected={filter.category}
            onSelect={(category) => setFilter((f) => ({ ...f, category }))}
          />
          <DateField
            label="From"
            value={filter.from}
            onChange={(from) => setFilter((f) => ({ ...f, from }))}
          />
          <DateField
            label="To"
            value={filter.to}
            onChange={(to) => setFilter((f) => ({ ...f, to }))}
          />
        </View>
      )}

      <FlatList
        data={filtering ? results : monthTxs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          filtering ? (
            <View style={styles.resultsHeader}>
              <Typography variant="caption" secondary>
                {results.length === 1 ? '1 result' : `${results.length} results`}
              </Typography>
              <View style={styles.balanceRow}>
                <Typography variant="caption" secondary>Income</Typography>
                <Typography variant="body" style={{ color: colors.success }}>
                  +{formatMoney(Math.abs(resultSummary.totalIncome), currency)}
                </Typography>
              </View>
              <View style={styles.balanceRow}>
                <Typography variant="caption" secondary>Expenses</Typography>
                <Typography variant="body" style={{ color: colors.destructive }}>
                  −{formatMoney(Math.abs(resultSummary.totalExpenses), currency)}
                </Typography>
              </View>
              <View style={styles.balanceRow}>
                <Typography variant="caption">Net</Typography>
                <Typography
                  variant="body"
                  style={{ color: resultSummary.balance < 0 ? colors.destructive : colors.text }}
                >
                  {formatMoney(resultSummary.balance, currency)}
                </Typography>
              </View>
            </View>
          ) : (
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
          )
        }
        ListEmptyComponent={
          filtering ? (
            <EmptyState message="No matching transactions" icon="search" />
          ) : (
            <EmptyState message="No transactions this month" icon="credit-card" />
          )
        }
      />

      <FAB onPress={() => setModalVisible(true)} />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Add Transaction"
      >
        <TransactionForm initial={{ date: dayStart }} submitLabel="Save" onSubmit={handleSave} />
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
  spacer: {
    flex: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  resultsHeader: {
    marginBottom: spacing.md,
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
