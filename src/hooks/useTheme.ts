import { useColorScheme } from 'react-native';
import { colors, type ThemeColors } from '../constants/theme';
import { useSettingsStore } from '../domains/settings/store';

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const scheme = useColorScheme();
  const preference = useSettingsStore((s) => s.settings.theme);
  const isDark = preference === 'system' ? scheme === 'dark' : preference === 'dark';
  return { colors: isDark ? colors.dark : colors.light, isDark };
}
