import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface FABProps {
  onPress: () => void;
  disabled?: boolean;
}

export function FAB({ onPress, disabled = false }: FABProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID="fab"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: colors.primary },
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Feather name="plus" size={24} color={colors.primaryForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dimmed: { opacity: 0.5 },
});
