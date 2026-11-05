import { createElement, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { fromDateInputValue, startOfDay, toDateInputValue } from '../lib/dates';
import { themeTransition } from '../lib/glass';
import { fontSize, radius, spacing, transitionMs } from '../constants/theme';

interface DateFieldProps {
  label: string;
  value: number | null;
  onChange(ts: number | null): void;
  error?: string | null;
  testID?: string;
}

/** Labelled date control: a DOM `<input type="date">` on web, the native picker elsewhere. */
export function DateField({ label, value, onChange, error, testID }: DateFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Typography variant="caption" secondary style={styles.label}>
        {label}
      </Typography>
      {Platform.OS === 'web' ? (
        <WebDateInput label={label} value={value} onChange={onChange} testID={testID} />
      ) : (
        <NativeDateInput label={label} value={value} onChange={onChange} testID={testID} />
      )}
      {error ? (
        <Typography
          variant="caption"
          accessibilityRole="alert"
          style={[styles.error, { color: colors.destructive }]}
        >
          {error}
        </Typography>
      ) : null}
    </View>
  );
}

type InputProps = Pick<DateFieldProps, 'label' | 'value' | 'onChange' | 'testID'>;

function WebDateInput({ label, value, onChange, testID }: InputProps) {
  const { colors, isDark } = useTheme();
  const style: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 44,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: 'inherit',
    colorScheme: isDark ? 'dark' : 'light',
    transition: `background-color ${transitionMs}ms ease, border-color ${transitionMs}ms ease, color ${transitionMs}ms ease`,
  };
  // An empty string means the field was cleared or holds a partial/invalid date: both are `null`.
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(fromDateInputValue(e.target.value));
  };
  return createElement('input', {
    type: 'date',
    value: value == null ? '' : toDateInputValue(value),
    onChange: handleChange,
    'aria-label': label,
    'data-testid': testID,
    style,
  });
}

function NativeDateInput({ label, value, onChange, testID }: InputProps) {
  const { colors, isDark } = useTheme();
  // Date the picker opens on; null while closed. Set in the press handler (Date.now is impure in render).
  const [pickerDate, setPickerDate] = useState<Date | null>(null);

  const handleValueChange = (_e: DateTimePickerChangeEvent, selected: Date) => {
    setPickerDate(null);
    onChange(startOfDay(selected.getTime()));
  };

  const display = value == null ? 'Select date' : new Date(value).toLocaleDateString();

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        accessibilityHint="Opens the date picker"
        onPress={() => setPickerDate(new Date(value ?? Date.now()))}
        style={[
          styles.control,
          { borderColor: colors.border, backgroundColor: colors.surface },
          themeTransition(),
        ]}
      >
        <Typography style={value == null ? { color: colors.textSecondary } : undefined}>
          {display}
        </Typography>
        <Feather name="calendar" size={18} color={colors.textSecondary} />
      </Pressable>
      {pickerDate ? (
        <DateTimePicker
          mode="date"
          value={pickerDate}
          onValueChange={handleValueChange}
          onDismiss={() => setPickerDate(null)}
          themeVariant={isDark ? 'dark' : 'light'}
          accentColor={colors.primary}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  label: {
    marginBottom: spacing.xs,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
  },
});
