import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/hooks/useTheme';
import { getDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrations';

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      await runMigrations(db);
      setDbReady(true);
    })();
  }, []);

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
