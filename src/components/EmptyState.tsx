import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../constants/theme';

interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {icon && (
        <Feather
          name={icon as keyof typeof Feather.glyphMap}
          size={48}
          color={colors.textSecondary}
          style={styles.icon}
        />
      )}
      <Typography variant="body" secondary style={styles.text}>
        {message}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  icon: { marginBottom: spacing.md },
  text: { textAlign: 'center' },
});
