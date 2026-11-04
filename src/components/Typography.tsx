import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { fontSize as fontSizes } from '../constants/theme';

type TypoVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption';

interface TypographyProps extends TextProps {
  variant?: TypoVariant;
  secondary?: boolean;
}

const variantStyles: Record<TypoVariant, TextStyle> = {
  h1: { fontSize: fontSizes.xxl, fontWeight: '700' },
  h2: { fontSize: fontSizes.xl, fontWeight: '600' },
  h3: { fontSize: fontSizes.lg, fontWeight: '600' },
  body: { fontSize: fontSizes.md, fontWeight: '400' },
  caption: { fontSize: fontSizes.sm, fontWeight: '400' },
};

export function Typography({
  variant = 'body',
  secondary = false,
  style,
  ...props
}: TypographyProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        variantStyles[variant],
        { color: secondary ? colors.textSecondary : colors.text },
        style,
      ]}
      {...props}
    />
  );
}
