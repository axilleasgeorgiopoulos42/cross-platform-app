import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { Modal } from '../../src/components/Modal';
import { TransactionItem } from '../../src/components/TransactionItem';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { useExpenseStore } from '../../src/domains/expenses/store';
import type { Category, Transaction } from '../../src/domains/expenses/types';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing, radius } from '../../src/constants/theme';

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const {
    transactions,
    balance,
    loadTransactions,
    addTransaction,
    deleteTransaction,
  } = useExpenseStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleSave = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    await addTransaction({
      type,
      amount: parsed,
      category: type === 'income' ? 'other' : category,
      note: note.trim() || null,
      date: Date.now(),
    });
    setAmount('');
    setNote('');
    setCategory('other');
    setType('expense');
    setModalVisible(false);
  }, [type, amount, category, note, addTransaction]);

  const handleDelete = useCallback(
    (id: string) => deleteTransaction(id),
    [deleteTransaction],
  );

  const balanceColor = balance.balance < 0 ? colors.destructive : colors.text;

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionItem transaction={item} onDelete={handleDelete} />
    ),
    [handleDelete],
  );

  return (
    <Screen scroll={false}>
      <Card style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <Typography variant="caption" secondary>Income</Typography>
          <Typography variant="body" style={{ color: colors.success }}>
            +{balance.totalIncome.toFixed(2)}
          </Typography>
        </View>
        <View style={styles.balanceRow}>
          <Typography variant="caption" secondary>Expenses</Typography>
          <Typography variant="body" style={{ color: colors.destructive }}>
            −{balance.totalExpenses.toFixed(2)}
          </Typography>
        </View>
        <View style={[styles.balanceRow, styles.totalRow]}>
          <Typography variant="caption">Balance</Typography>
          <Typography variant="h1" style={{ color: balanceColor }}>
            {balance.balance.toFixed(2)}
          </Typography>
        </View>
      </Card>

      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState message="No transactions yet" icon="credit-card" />
        }
      />

      <FAB onPress={() => setModalVisible(true)} />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Add Transaction"
      >
        <View style={styles.typeToggle}>
          <Button
            title="Income"
            variant={type === 'income' ? 'primary' : 'secondary'}
            onPress={() => setType('income')}
            style={styles.toggleBtn}
          />
          <Button
            title="Expense"
            variant={type === 'expense' ? 'primary' : 'secondary'}
            onPress={() => setType('expense')}
            style={styles.toggleBtn}
          />
        </View>

        <TextInput
          placeholder="0.00"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={[
            styles.amountInput,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        />

        {type === 'expense' && (
          <CategoryPicker
            selected={category}
            onSelect={setCategory}
            type={type}
          />
        )}

        <TextInput
          placeholder="Add a note..."
          placeholderTextColor={colors.textSecondary}
          value={note}
          onChangeText={setNote}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        />

        <Button
          title="Save"
          onPress={handleSave}
          disabled={!amount || parseFloat(amount) <= 0}
          style={styles.saveBtn}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  typeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
});
