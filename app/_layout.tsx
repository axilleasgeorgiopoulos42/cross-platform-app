import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/hooks/useTheme';
import { getDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrations';

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
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

  if (!dbReady) return null;

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
      />
    </>
  );
}
