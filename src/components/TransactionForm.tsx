import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from './Button';
import { CategoryPicker } from './CategoryPicker';
import type { Category } from '../domains/expenses/types';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius } from '../constants/theme';

export interface TransactionFormValues {
  type: 'income' | 'expense';
  amount: number;
  category: Category;
  note: string | null;
}

interface TransactionFormProps {
  initial?: Partial<TransactionFormValues>;
  submitLabel: string;
  onSubmit(values: TransactionFormValues): void | Promise<void>;
}

export function TransactionForm({ initial, submitLabel, onSubmit }: TransactionFormProps) {
  const { colors } = useTheme();
  const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'other');
  const [note, setNote] = useState(initial?.note ?? '');

  const parsed = parseFloat(amount);
  const disabled = !amount.trim() || isNaN(parsed) || parsed <= 0;

  const handleSubmit = async () => {
    if (disabled) return;
    await onSubmit({
      type,
      amount: parsed,
      category: type === 'income' ? 'other' : category,
      note: note.trim() || null,
    });
    setType(initial?.type ?? 'expense');
    setAmount(initial?.amount != null ? String(initial.amount) : '');
    setCategory(initial?.category ?? 'other');
    setNote(initial?.note ?? '');
  };

  return (
    <View>
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
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      />

      {type === 'expense' && (
        <CategoryPicker selected={category} onSelect={setCategory} type={type} />
      )}

      <TextInput
        placeholder="Add a note..."
        placeholderTextColor={colors.textSecondary}
        value={note}
        onChangeText={setNote}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      />

      <Button
        title={submitLabel}
        onPress={handleSubmit}
        disabled={disabled}
        style={styles.saveBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 44,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
});
