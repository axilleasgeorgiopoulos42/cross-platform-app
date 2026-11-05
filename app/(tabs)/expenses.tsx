import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { Modal } from '../../src/components/Modal';
import { RangePicker } from '../../src/components/RangePicker';
import { SpendChart } from '../../src/components/SpendChart';
import { CategoryList } from '../../src/components/CategoryList';
import { SearchBar } from '../../src/components/SearchBar';
import { CategoryFilter } from '../../src/components/CategoryFilter';
import {
  TransactionForm,
  type TransactionFormValues,
} from '../../src/components/TransactionForm';
import { useExpenseStore } from '../../src/domains/expenses/store';
import { bucketExpenses } from '../../src/domains/expenses/chart';
import {
  defaultRange,
  inRange,
  rangeFor,
  type DateRange,
} from '../../src/domains/expenses/range';
import {
  EMPTY_FILTER,
  filterTransactions,
  isFilterActive,
  type TransactionFilter,
} from '../../src/domains/expenses/search';
import { useSettingsStore } from '../../src/domains/settings/store';
import { groupByCategory, summarize } from '../../src/domains/expenses/summary';
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
  const [range, setRange] = useState<DateRange>(() => defaultRange());

  const filtering = isFilterActive(filter);
  const rangeTxs = useMemo(
    () => filterTransactions(transactions, { ...filter, from: range.from, to: range.to }),
    [transactions, filter, range],
  );
  const summary = useMemo(() => summarize(rangeTxs), [rangeTxs]);
  const buckets = useMemo(() => bucketExpenses(rangeTxs, range), [rangeTxs, range]);
  const groups = useMemo(() => groupByCategory(rangeTxs), [rangeTxs]);
  const hasExpenses = groups.length > 0;

  const toggleFilter = useCallback(() => {
    if (filterOpen) {
      setFilterOpen(false);
      setFilter(EMPTY_FILTER);
    } else {
      setFilterOpen(true);
    }
  }, [filterOpen]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSave = useCallback(
    async (values: TransactionFormValues) => {
      useExpenseStore.setState({ error: null });
      await addTransaction(values);
      if (useExpenseStore.getState().error === null && !inRange(range, values.date)) {
        // Show the month of the new transaction so it is visible.
        setRange(rangeFor('month', values.date));
      }
      setModalVisible(false);
    },
    [addTransaction, range],
  );

  const handleDelete = useCallback(
    (id: string) => deleteTransaction(id),
    [deleteTransaction],
  );

  const netColor = summary.balance < 0 ? colors.destructive : colors.text;

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.pickerRow}>
          <View style={styles.picker}>
            <RangePicker range={range} onChange={setRange} />
          </View>
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
          </View>
        )}

        <Card style={styles.balanceCard}>
          <Typography variant="caption" secondary>Expenses</Typography>
          <Typography variant="h1" style={{ color: colors.destructive }}>
            −{formatMoney(Math.abs(summary.totalExpenses), currency)}
          </Typography>
          <View style={styles.balanceRow}>
            <Typography variant="caption" secondary>Income</Typography>
            <Typography variant="body" style={{ color: colors.success }}>
              +{formatMoney(Math.abs(summary.totalIncome), currency)}
            </Typography>
          </View>
          <View style={styles.balanceRow}>
            <Typography variant="caption" secondary>Net</Typography>
            <Typography variant="body" style={{ color: netColor }}>
              {formatMoney(summary.balance, currency)}
            </Typography>
          </View>
          <View style={[styles.balanceRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Typography variant="caption" secondary>All time</Typography>
            <Typography variant="caption" secondary>
              {formatMoney(balance.balance, currency)}
            </Typography>
          </View>
        </Card>

        {hasExpenses ? (
          <>
            <SpendChart key={`${range.from}-${range.to}`} buckets={buckets} currency={currency} />
            <CategoryList groups={groups} currency={currency} onDelete={handleDelete} />
          </>
        ) : filtering ? (
          <EmptyState message="No matching transactions" icon="search" />
        ) : (
          <EmptyState message="No expenses in this range" icon="credit-card" />
        )}
      </ScrollView>

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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  picker: {
    flex: 1,
    minWidth: 0,
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
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  list: {
    flexGrow: 1,
    paddingBottom: 80,
  },
});
