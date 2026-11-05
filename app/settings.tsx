import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Typography } from '../src/components/Typography';
import { Button } from '../src/components/Button';
import { useTheme } from '../src/hooks/useTheme';
import { fontSize, radius, spacing } from '../src/constants/theme';
import { CURRENCIES } from '../src/constants/currencies';
import { THEME_PREFERENCES, type ThemePreference } from '../src/domains/settings/types';
import { useSettingsStore } from '../src/domains/settings/store';
import { useBackupStore } from '../src/domains/backup/store';
import { confirmAction } from '../src/lib/confirm';
import { downloadTextFile, pickTextFile } from '../src/lib/files';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surfaceAlt,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[styles.chipLabel, { color: selected ? colors.primaryForeground : colors.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const {
    settings,
    error: settingsError,
    setCurrency,
    setTheme,
    clearError: clearSettingsError,
  } = useSettingsStore();
  const {
    error: backupError,
    exportBackup,
    previewBackup,
    importBackup,
    clearData,
    clearError: clearBackupError,
  } = useBackupStore();

  const [info, setInfo] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clearAllErrors = useCallback(() => {
    setFileError(null);
    clearBackupError();
    clearSettingsError();
  }, [clearBackupError, clearSettingsError]);

  useEffect(() => {
    clearBackupError();
    clearSettingsError();
    return clearAllErrors;
  }, [clearAllErrors, clearBackupError, clearSettingsError]);

  const shownError = fileError ?? backupError ?? settingsError;

  const handleExport = async () => {
    setInfo(null);
    clearAllErrors();
    const result = await exportBackup();
    if (!result) return;
    try {
      downloadTextFile(result.filename, result.json);
      setInfo(`Exported ${result.filename}`);
    } catch (e) {
      setFileError((e as Error).message);
    }
  };

  const handleImport = async () => {
    if (busy) return;
    setInfo(null);
    clearAllErrors();
    setBusy(true);
    try {
      let text: string | null;
      try {
        text = await pickTextFile();
      } catch (e) {
        setFileError((e as Error).message);
        return;
      }
      if (text === null) return;
      const preview = previewBackup(text);
      if (!preview) return;
      const ok = await confirmAction(
        'Replace all current data?',
        `This replaces everything with ${preview.events} events and ${preview.transactions} transactions from the file.`,
        'Replace',
      );
      if (!ok) return;
      const counts = await importBackup(text);
      if (counts) {
        setInfo(`Imported ${counts.events} events and ${counts.transactions} transactions.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (busy) return;
    setInfo(null);
    clearAllErrors();
    setBusy(true);
    try {
      const ok = await confirmAction(
        'Clear all data?',
        'All events and transactions will be deleted. This cannot be undone.',
        'Clear',
      );
      if (!ok) return;
      if (await clearData()) setInfo('All data cleared.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Typography variant="h3" style={styles.heading}>Currency</Typography>
      <View style={styles.chips}>
        {CURRENCIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={settings.currency === c}
            onPress={() => setCurrency(c)}
          />
        ))}
      </View>

      <Typography variant="h3" style={styles.heading}>Theme</Typography>
      <View style={styles.chips}>
        {THEME_PREFERENCES.map((t) => (
          <Chip
            key={t}
            label={THEME_LABELS[t]}
            selected={settings.theme === t}
            onPress={() => setTheme(t)}
          />
        ))}
      </View>

      {Platform.OS === 'web' ? (
        <>
          <Typography variant="h3" style={styles.heading}>Backup</Typography>
          <View style={styles.buttons}>
            <Button title="Export backup" variant="secondary" onPress={handleExport} />
            <Button title="Import backup" variant="secondary" onPress={handleImport} disabled={busy} />
          </View>
        </>
      ) : null}

      {info ? (
        <Typography variant="caption" style={[styles.message, { color: colors.success }]}>
          {info}
        </Typography>
      ) : null}
      {shownError ? (
        <Typography
          variant="caption"
          accessibilityRole="alert"
          style={[styles.message, { color: colors.destructive }]}
        >
          {shownError}
        </Typography>
      ) : null}

      <Typography variant="h3" style={styles.heading}>Danger zone</Typography>
      <Button title="Clear all data" variant="destructive" onPress={handleClear} disabled={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  heading: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  buttons: {
    gap: spacing.sm,
  },
  message: {
    marginTop: spacing.md,
  },
});
