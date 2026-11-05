import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from './Button';
import { CategoryPicker } from './CategoryPicker';
import { DateField } from './DateField';
import type { Category } from '../domains/expenses/types';
import { useTheme } from '../hooks/useTheme';
import { createSubmitGuard } from '../lib/submitGuard';
import { startOfDay } from '../lib/dates';
import { spacing, radius } from '../constants/theme';

export interface TransactionFormValues {
  type: 'income' | 'expense';
  amount: number;
  category: Category;
  note: string | null;
  date: number;
}

interface TransactionFormProps {
  initial?: Partial<TransactionFormValues>;
  submitLabel: string;
  resetOnSubmit?: boolean;
  onSubmit(values: TransactionFormValues): void | Promise<void>;
}

export function TransactionForm({ initial, submitLabel, onSubmit, resetOnSubmit = true }: TransactionFormProps) {
  const { colors } = useTheme();
  const guard = useRef(createSubmitGuard()).current;
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'other');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState<number | null>(() => initial?.date ?? startOfDay(Date.now()));
  const [dateTouched, setDateTouched] = useState(false);

  const parsed = parseFloat(amount);
  const disabled = !amount.trim() || isNaN(parsed) || parsed <= 0 || date == null;

  const handleSubmit = async () => {
    if (disabled || date == null || guard.isRunning()) return;
    setSubmitting(true);
    try {
      await guard.run(async () => {
        await onSubmit({
          type,
          amount: parsed,
          category: type === 'income' ? 'other' : category,
          note: note.trim() || null,
          date,
        });
        if (resetOnSubmit) {
          setType(initial?.type ?? 'expense');
          setAmount(initial?.amount != null ? String(initial.amount) : '');
          setCategory(initial?.category ?? 'other');
          setNote(initial?.note ?? '');
          setDate(initial?.date ?? startOfDay(Date.now()));
          setDateTouched(false);
        }
      });
    } finally {
      setSubmitting(false);
    }
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

      <DateField
        label="Date"
        value={date}
        onChange={(ts) => {
          setDate(ts);
          setDateTouched(true);
        }}
        error={dateTouched && date == null ? 'Choose a date' : null}
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
        disabled={disabled || submitting}
        loading={submitting}
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
