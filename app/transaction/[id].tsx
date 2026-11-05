import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { TransactionForm, type TransactionFormValues } from '../../src/components/TransactionForm';
import { Typography } from '../../src/components/Typography';
import { useExpenseStore } from '../../src/domains/expenses/store';
import type { Transaction } from '../../src/domains/expenses/types';
import { confirmAction } from '../../src/lib/confirm';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing } from '../../src/constants/theme';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const fetchTransaction = useExpenseStore((s) => s.fetchTransaction);
  const updateTransaction = useExpenseStore((s) => s.updateTransaction);
  const deleteTransaction = useExpenseStore((s) => s.deleteTransaction);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const found = id ? await fetchTransaction(id) : null;
      if (cancelled) return;
      setTransaction(found);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fetchTransaction]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/expenses');
  }, []);

  const finish = () => {
    const err = useExpenseStore.getState().error;
    if (err) setErrorMsg(err);
    else router.back();
  };

  const handleSave = async (values: TransactionFormValues) => {
    if (!transaction) return;
    setErrorMsg(null);
    useExpenseStore.setState({ error: null });
    await updateTransaction(transaction.id, values);
    finish();
  };

  const handleDelete = async () => {
    if (!transaction) return;
    const ok = await confirmAction('Delete transaction', 'This cannot be undone.', 'Delete');
    if (!ok) return;
    setErrorMsg(null);
    useExpenseStore.setState({ error: null });
    await deleteTransaction(transaction.id);
    finish();
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <EmptyState message="Not found" icon="alert-circle" />
        <Button title="Go back" onPress={goBack} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TransactionForm
        key={transaction.id}
        initial={{
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          note: transaction.note,
        }}
        submitLabel="Save"
        onSubmit={handleSave}
        resetOnSubmit={false}
      />
      {errorMsg ? (
        <Typography variant="caption" style={{ color: colors.destructive }}>
          {errorMsg}
        </Typography>
      ) : null}
      <Button title="Delete" variant="destructive" onPress={handleDelete} style={styles.delete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { flex: 1, padding: spacing.md },
  content: { padding: spacing.md, gap: spacing.md },
  delete: { marginTop: spacing.sm },
});
