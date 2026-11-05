import { useRef, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { Typography } from './Typography';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';
import { isValidTime } from '../lib/time';
import { createSubmitGuard } from '../lib/submitGuard';
import { spacing, radius } from '../constants/theme';

export interface EventFormValues {
  title: string;
  time: string | null;
  notes: string | null;
}

interface EventFormProps {
  initial?: Partial<EventFormValues>;
  submitLabel: string;
  resetOnSubmit?: boolean;
  onSubmit(values: EventFormValues): void | Promise<void>;
}

export function EventForm({ initial, submitLabel, onSubmit, resetOnSubmit = true }: EventFormProps) {
  const { colors } = useTheme();
  const guard = useRef(createSubmitGuard()).current;
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [allDay, setAllDay] = useState(initial?.time == null);
  const [time, setTime] = useState(initial?.time ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const timeInvalid = !allDay && time.trim() !== '' && !isValidTime(time.trim());
  const disabled = !title.trim() || timeInvalid;

  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
  ];

  const handleSubmit = async () => {
    if (disabled || guard.isRunning()) return;
    setSubmitting(true);
    try {
      await guard.run(async () => {
        await onSubmit({
          title: title.trim(),
          time: allDay ? null : time.trim() || null,
          notes: notes.trim() || null,
        });
        if (resetOnSubmit) {
          setTitle(initial?.title ?? '');
          setAllDay(initial?.time == null);
          setTime(initial?.time ?? '');
          setNotes(initial?.notes ?? '');
        }
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Event title"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        style={inputStyle}
      />

      <View style={styles.switchRow}>
        <Typography variant="body">All day</Typography>
        <Switch
          value={allDay}
          onValueChange={setAllDay}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      {!allDay && (
        <TextInput
          placeholder="Time (e.g. 14:30)"
          placeholderTextColor={colors.textSecondary}
          value={time}
          onChangeText={setTime}
          style={[inputStyle, timeInvalid && { borderColor: colors.destructive }]}
        />
      )}

      <TextInput
        placeholder="Notes"
        placeholderTextColor={colors.textSecondary}
        value={notes}
        onChangeText={setNotes}
        multiline
        style={[inputStyle, styles.notes]}
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
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
});
