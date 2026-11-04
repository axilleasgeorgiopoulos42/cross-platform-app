import { StyleSheet, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { Card } from '../../src/components/Card';
import { spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';

export default function SettingsScreen() {
  const { isDark } = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Typography variant="h2">Settings</Typography>

        <Card style={styles.card}>
          <Typography variant="body">Theme</Typography>
          <Typography variant="caption" secondary>
            Currently using {isDark ? 'dark' : 'light'} mode (follows system).
          </Typography>
        </Card>

        <Card style={styles.card}>
          <Typography variant="body">Version</Typography>
          <Typography variant="caption" secondary>
            1.0.0
          </Typography>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginTop: spacing.lg },
  card: { marginTop: spacing.sm },
});
