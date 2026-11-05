import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DateField } from './DateField';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../constants/theme';
import {
  customRange,
  rangeFor,
  rangeLabel,
  shiftRange,
  validateRange,
  type DateRange,
  type RangePreset,
} from '../domains/expenses/range';

interface RangePickerProps {
  range: DateRange;
  onChange(r: DateRange): void;
}

const PRESETS: readonly { key: RangePreset; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '3months', label: '3 Months' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom' },
];

/**
 * Presentational range selector: preset chips, a period stepper, and From/To fields for custom.
 * The screen owns the range; an invalid custom draft is shown inline and never reported upward.
 */
export function RangePicker({ range, onChange }: RangePickerProps) {
  const { colors } = useTheme();
  const isCustom = range.preset === 'custom';

  // Local drafts so an invalid (e.g. From after To) entry doesn't leak to the screen.
  const [draftFrom, setDraftFrom] = useState<number | null>(range.from);
  const [draftTo, setDraftTo] = useState<number | null>(range.to);
  const [seededFor, setSeededFor] = useState<RangePreset>(range.preset);
  if (seededFor !== range.preset) {
    // Re-seed when the preset changes (adjusting state during render, per React docs).
    setSeededFor(range.preset);
    if (range.preset === 'custom') {
      setDraftFrom(range.from);
      setDraftTo(range.to);
    }
  }

  const error = isCustom ? validateRange(draftFrom, draftTo) : null;

  const update = (from: number | null, to: number | null) => {
    setDraftFrom(from);
    setDraftTo(to);
    if (validateRange(from, to) === null) {
      onChange(customRange(from as number, to as number));
    }
  };

  const selectPreset = (preset: RangePreset) => {
    if (preset === 'custom') {
      // Re-seed the drafts (also when Custom is re-tapped) so a stale invalid draft/error clears.
      setDraftFrom(range.from);
      setDraftTo(range.to);
      onChange(customRange(range.from, range.to));
    } else {
      onChange(rangeFor(preset, range.from));
    }
  };

  return (
    <View>
      <View style={styles.chips}>
        {PRESETS.map(({ key, label }) => {
          const selected = key === range.preset;
          const fg = selected ? colors.primaryForeground : colors.text;
          return (
            <Pressable
              key={key}
              onPress={() => selectPreset(key)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                { backgroundColor: selected ? colors.primary : colors.surfaceAlt },
              ]}
            >
              <Typography variant="caption" style={{ color: fg }}>
                {label}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {isCustom ? (
        <View>
          <DateField label="From" value={draftFrom} onChange={(ts) => update(ts, draftTo)} />
          <DateField label="To" value={draftTo} onChange={(ts) => update(draftFrom, ts)} />
          {error ? (
            <Typography
              variant="caption"
              accessibilityRole="alert"
              style={{ color: colors.destructive }}
            >
              {error}
            </Typography>
          ) : null}
        </View>
      ) : (
        <View style={styles.stepper}>
          <Pressable
            onPress={() => onChange(shiftRange(range, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous period"
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Feather name="chevron-left" size={24} color={colors.text} />
          </Pressable>
          <Typography variant="h2" style={styles.label}>
            {rangeLabel(range)}
          </Typography>
          <Pressable
            onPress={() => onChange(shiftRange(range, 1))}
            accessibilityRole="button"
            accessibilityLabel="Next period"
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Feather name="chevron-right" size={24} color={colors.text} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    height: 44,
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
  },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, textAlign: 'center' },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
