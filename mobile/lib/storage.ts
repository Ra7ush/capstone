import AsyncStorage from "@react-native-async-storage/async-storage";

// We try to import createMMKV safely. If it fails (like in Expo Go), we fall back.
let storageInstance: any = null;
let isMMKVAvailable = false;

try {
  const { createMMKV } = require("react-native-mmkv");
  storageInstance = createMMKV({
    id: "capstone-app-storage",
  });
  isMMKVAvailable = true;
  console.log("✅ MMKV Initialized");
} catch (e) {
  console.warn(
    "⚠️ MMKV not supported in Expo Go. Falling back to AsyncStorage.",
  );
}

/**
 * Storage wrapper for synchronous access.
 * Note: In Expo Go (AsyncStorage), this won't be truly synchronous for writes/reads
 * unless we implement a memory cache. For now, it provides a safe interface.
 */
export const mmkvStorage = {
  getItem: (key: string): string | null => {
    if (isMMKVAvailable) {
      return storageInstance.getString(key) ?? null;
    }
    // Fallback: This is tricky because AsyncStorage is async.
    // For now, we return null to avoid crashing, but mmkvStorageAsync is preferred.
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (isMMKVAvailable) {
      storageInstance.set(key, value);
    } else {
      AsyncStorage.setItem(key, value).catch(console.error);
    }
  },
  removeItem: (key: string): void => {
    if (isMMKVAvailable) {
      storageInstance.remove(key);
    } else {
      AsyncStorage.removeItem(key).catch(console.error);
    }
  },
};

/**
 * Async wrapper for Supabase, TanStack Query, etc.
 * This is the recommended way to use storage in this app to ensure Expo Go compatibility.
 */
export const mmkvStorageAsync = {
  getItem: async (key: string): Promise<string | null> => {
    if (isMMKVAvailable) {
      return storageInstance.getString(key) ?? null;
    }
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isMMKVAvailable) {
      storageInstance.set(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (isMMKVAvailable) {
      storageInstance.remove(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },
  getAllKeys: async (): Promise<readonly string[]> => {
    if (isMMKVAvailable) {
      return storageInstance.getAllKeys();
    }
    return await AsyncStorage.getAllKeys();
  },
};

// Export the raw instance for advanced usage (will be null in Expo Go)
export const storage = storageInstance;
