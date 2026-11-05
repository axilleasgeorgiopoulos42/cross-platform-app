import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { EventItem } from '../../src/components/EventItem';
import { EmptyState } from '../../src/components/EmptyState';
import { Modal } from '../../src/components/Modal';
import { EventForm, type EventFormValues } from '../../src/components/EventForm';
import {
  TransactionForm,
  type TransactionFormValues,
} from '../../src/components/TransactionForm';
import { useCalendarStore } from '../../src/domains/calendar/store';
import { useExpenseStore } from '../../src/domains/expenses/store';
import { useSettingsStore } from '../../src/domains/settings/store';
import { filterByMonth, summarize } from '../../src/domains/expenses/summary';
import { formatMoney } from '../../src/lib/money';
import { useTodayStart } from '../../src/hooks/useTodayStart';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing } from '../../src/constants/theme';

type QuickAdd = 'event' | 'expense' | null;

export default function TodayScreen() {
  const { colors } = useTheme();
  const todaysEvents = useCalendarStore((s) => s.todayEvents);
  const loadToday = useCalendarStore((s) => s.loadToday);
  const addEvent = useCalendarStore((s) => s.addEvent);
  const deleteEvent = useCalendarStore((s) => s.deleteEvent);
  const transactions = useExpenseStore((s) => s.transactions);
  const loadTransactions = useExpenseStore((s) => s.loadTransactions);
  const addTransaction = useExpenseStore((s) => s.addTransaction);
  const currency = useSettingsStore((s) => s.settings.currency);

  const [quickAdd, setQuickAdd] = useState<QuickAdd>(null);

  const reload = useCallback(() => {
    loadToday();
    loadTransactions();
  }, [loadToday, loadTransactions]);

  const dayStart = useTodayStart(reload);
  const now = useMemo(() => new Date(dayStart), [dayStart]);

  useFocusEffect(reload);

  const year = now.getFullYear();
  const month = now.getMonth();

  const summary = useMemo(
    () => summarize(filterByMonth(transactions, year, month)),
    [transactions, year, month],
  );

  const heading = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const closeModal = useCallback(() => setQuickAdd(null), []);

  const handleAddEvent = useCallback(
    async (values: EventFormValues) => {
      await addEvent(values.title, values.date, values.time, values.notes);
      setQuickAdd(null);
    },
    [addEvent],
  );

  const handleAddExpense = useCallback(
    async (values: TransactionFormValues) => {
      await addTransaction(values);
      setQuickAdd(null);
    },
    [addTransaction],
  );

  const handleDelete = useCallback((id: string) => deleteEvent(id), [deleteEvent]);

  const net = summary.balance;
  const netColor = net < 0 ? colors.destructive : colors.success;
  const netText = formatMoney(net, currency);

  return (
    <Screen>
      <Typography variant="h1" style={styles.heading}>
        {heading}
      </Typography>

      <Card style={styles.card}>
        <Typography variant="caption" secondary>
          {monthLabel}
        </Typography>
        <View style={styles.row}>
          <View>
            <Typography variant="caption" secondary>Income</Typography>
            <Typography variant="body" style={{ color: colors.success }}>
              +{formatMoney(Math.abs(summary.totalIncome), currency)}
            </Typography>
          </View>
          <View>
            <Typography variant="caption" secondary>Expenses</Typography>
            <Typography variant="body" style={{ color: colors.destructive }}>
              −{formatMoney(Math.abs(summary.totalExpenses), currency)}
            </Typography>
          </View>
          <View>
            <Typography variant="caption" secondary>Net</Typography>
            <Typography variant="body" style={{ color: netColor, fontWeight: '600' }}>
              {netText}
            </Typography>
          </View>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button title="Add event" onPress={() => setQuickAdd('event')} style={styles.action} />
        <Button
          title="Add expense"
          variant="secondary"
          onPress={() => setQuickAdd('expense')}
          style={styles.action}
        />
      </View>

      <View style={styles.eventSection}>
        <Typography variant="h3">Today&apos;s events</Typography>
        {todaysEvents.length === 0 ? (
          <EmptyState message="Nothing planned today" icon="sun" />
        ) : (
          todaysEvents.map((ev) => (
            <EventItem key={ev.id} event={ev} onDelete={handleDelete} />
          ))
        )}
      </View>

      <Modal visible={quickAdd === 'event'} onClose={closeModal} title="Add Event">
        <EventForm initial={{ date: dayStart }} submitLabel="Save" onSubmit={handleAddEvent} />
      </Modal>
      <Modal visible={quickAdd === 'expense'} onClose={closeModal} title="Add Expense">
        <TransactionForm initial={{ date: dayStart }} submitLabel="Save" onSubmit={handleAddExpense} />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: spacing.md, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  action: { flex: 1 },
  eventSection: { flex: 1 },
});
