import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/hooks/useTheme';
import { getDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrations';
import { useSettingsStore } from '../src/domains/settings/store';
import { registerServiceWorker } from '../src/lib/registerServiceWorker';

// Deep links / reloads on a detail screen get the tabs underneath (back button works).
// SDK 58 expo-router deprecates `initialRouteName` in favour of `anchor`.
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        await useSettingsStore.getState().load();
        setDbReady(true);
      } catch (e) {
        console.error('DB init failed:', e);
        setDbError((e as Error).message);
      }
    })();
  }, []);

  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background }}>
        <Text style={{ color: colors.destructive, fontSize: 16, textAlign: 'center' }}>
          Database failed to initialize: {dbError}
        </Text>
      </View>
    );
  }

  if (!dbReady || !settingsLoaded) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
        <Stack.Screen name="transaction/[id]" options={{ title: 'Transaction' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
