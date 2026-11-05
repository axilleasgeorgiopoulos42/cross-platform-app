import { Pressable, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerRight: () => (
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gear}
          >
            <Feather name="settings" size={22} color={colors.text} />
          </Pressable>
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Feather name="sun" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => (
            <Feather name="credit-card" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  gear: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
