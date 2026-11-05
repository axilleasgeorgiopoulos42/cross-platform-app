import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { startOfDay } from '../lib/dates';

/**
 * Current local start-of-day timestamp. Recomputed on mount, when the screen
 * gains focus, and when the app returns to the foreground (react-native-web
 * maps AppState 'active' to the page becoming visible), so a home-screen app
 * resumed on a later day does not keep showing yesterday.
 *
 * `onActive` (optional) runs each time the app becomes active again.
 */
export function useTodayStart(onActive?: () => void): number {
  const [todayStart, setTodayStart] = useState(() => startOfDay(Date.now()));

  useFocusEffect(
    useCallback(() => {
      setTodayStart(startOfDay(Date.now()));
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setTodayStart(startOfDay(Date.now()));
      onActive?.();
    });
    return () => subscription.remove();
  }, [onActive]);

  return todayStart;
}
