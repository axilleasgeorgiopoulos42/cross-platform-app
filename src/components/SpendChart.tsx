import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import type { Currency } from '../constants/currencies';
import { barHeight, visibleLabelIndexes, type Bucket } from '../domains/expenses/chart';
import { formatMoney } from '../lib/money';
import { radius, spacing } from '../constants/theme';

const PLOT_HEIGHT = 140;
const LABEL_WIDTH = 48;

interface SpendChartProps {
  buckets: Bucket[];
  currency: Currency;
}

export function SpendChart({ buckets, currency }: SpendChartProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  if (buckets.length === 0) return null;

  const max = buckets.reduce((m, b) => Math.max(m, b.total), 0);
  const sel = selected !== null && selected < buckets.length ? buckets[selected] : null;
  const caption = sel
    ? `${sel.label} — ${formatMoney(sel.total, currency)}`
    : formatMoney(max, currency);
  const labelAt = new Set(visibleLabelIndexes(buckets.length));

  return (
    <View style={styles.wrap}>
      <Typography variant="caption" secondary numberOfLines={1}>
        {caption}
      </Typography>
      <View style={styles.plot}>
        {buckets.map((b, i) => {
          const isSel = i === selected;
          return (
            <Pressable
              key={b.start}
              style={styles.column}
              onPress={() => setSelected(isSel ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${b.label}: ${formatMoney(b.total, currency)}`}
            >
              <View
                style={{
                  height: barHeight(b.total, max, PLOT_HEIGHT),
                  minHeight: b.total > 0 ? 3 : 0,
                  backgroundColor: isSel ? colors.text : colors.primary,
                  borderRadius: radius.sm / 4,
                  width: '70%',
                }}
              />
            </Pressable>
          );
        })}
        <View style={[styles.baseline, { backgroundColor: colors.border }]} />
      </View>
      <View style={styles.labels}>
        {buckets.map((b, i) => (
          <View key={b.start} style={styles.labelCell}>
            {labelAt.has(i) ? (
              <Typography
                variant="caption"
                secondary
                numberOfLines={1}
                style={styles.label}
              >
                {b.label}
              </Typography>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  plot: { flexDirection: 'row', height: PLOT_HEIGHT, alignItems: 'flex-end' },
  column: {
    flex: 1,
    height: PLOT_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  baseline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1 },
  labels: { flexDirection: 'row', height: 20 },
  labelCell: { flex: 1, alignItems: 'center' },
  label: { position: 'absolute', width: LABEL_WIDTH, textAlign: 'center' },
});
