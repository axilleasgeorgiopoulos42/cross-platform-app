import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { fontSize, radius, spacing } from '../constants/theme';
import { glow, themeTransition } from '../lib/glass';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const bg: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    destructive: colors.destructive,
  };

  const fg: Record<Variant, string> = {
    primary: colors.primaryForeground,
    secondary: colors.text,
    ghost: colors.primary,
    destructive: colors.primaryForeground,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        themeTransition(),
        variant === 'primary' && !disabled && glow(colors.glow),
        { backgroundColor: bg[variant] },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} size="small" />
      ) : (
        <Text style={[styles.label, { color: fg[variant] }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
