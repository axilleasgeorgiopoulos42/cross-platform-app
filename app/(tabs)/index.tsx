import { StyleSheet, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { spacing } from '../../src/constants/theme';

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Typography variant="h1">Welcome</Typography>
        <Typography variant="body" secondary>
          Your cross-platform app is ready.
        </Typography>
      </View>

      <Card style={styles.card}>
        <Typography variant="h3">Get Started</Typography>
        <Typography variant="caption" secondary style={styles.cardText}>
          This app runs on iOS, Android, and Web with a single codebase using
          Expo and React Native.
        </Typography>
        <Button title="Learn More" onPress={() => {}} style={styles.btn} />
      </Card>

      <Card style={styles.card}>
        <Typography variant="h3">Architecture</Typography>
        <Typography variant="caption" secondary style={styles.cardText}>
          Layered service pattern — components, hooks, services, and types are
          separated for maintainability.
        </Typography>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  cardText: { marginTop: spacing.xs },
  btn: { marginTop: spacing.md },
});
