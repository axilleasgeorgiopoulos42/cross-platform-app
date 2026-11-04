import { Platform } from 'react-native';

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const webStorage: StorageAdapter = {
  getItem: async (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

let _adapter: StorageAdapter = webStorage;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    _adapter = AsyncStorage;
  } catch {
    // Falls back to web storage (works in Expo Go via RN's localStorage polyfill)
  }
}

export const storage: StorageAdapter = _adapter;
