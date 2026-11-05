import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarHeight } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { glow, themeTransition } from '../lib/glass';

interface FABProps {
  onPress: () => void;
  disabled?: boolean;
}

export function FAB({ onPress, disabled = false }: FABProps) {
  const { colors } = useTheme();
  const bottom = 24 + tabBarHeight + useSafeAreaInsets().bottom;

  return (
    <Pressable
      testID="fab"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.fab,
        themeTransition(),
        glow(colors.glow),
        { bottom },
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
  },
  dimmed: { opacity: 0.5 },
});
