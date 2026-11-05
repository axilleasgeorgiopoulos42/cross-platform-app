import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { spacing, tabBarHeight } from '../constants/theme';
import { themeTransition } from '../lib/glass';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}

export function Screen({ children, scroll = true, padded = true }: ScreenProps) {
  const { colors } = useTheme();
  // The tab bar floats over content (frosted glass), so reserve its height.
  const inset = tabBarHeight + useSafeAreaInsets().bottom;
  const content = (
    <View style={[styles.inner, padded && styles.padded, { paddingBottom: inset }]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, themeTransition(), { backgroundColor: colors.background }]} edges={['top']}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.md },
});
