import { StyleSheet, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { spacing } from '../../src/constants/theme';

export default function ExpensesScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Typography variant="h2">Expenses</Typography>
        <Typography variant="body" secondary>
          Coming soon.
        </Typography>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginTop: spacing.lg },
});
