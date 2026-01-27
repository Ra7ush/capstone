import { mmkvStorageAsync, storage } from "./storage";

const CACHE_PREFIX = "msg_cache_";
const MAX_CACHED_CONVERSATIONS = 20;

export interface CachedConversation {
  messages: any[];
  otherUser: any;
  lastUpdated: number;
}

/**
 * Get cached messages for a conversation (page 1 only)
 */
export async function getCachedMessages(
  conversationId: string,
): Promise<CachedConversation | null> {
  try {
    const key = `${CACHE_PREFIX}${conversationId}`;
    const cached = await mmkvStorageAsync.getItem(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    console.warn("Failed to read message cache:", error);
    return null;
  }
}

/**
 * Store page 1 messages for a conversation
 */
export async function setCachedMessages(
  conversationId: string,
  messages: any[],
  otherUser: any,
): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${conversationId}`;
    const data: CachedConversation = {
      messages: messages.slice(0, 10), // Only store first 10
      otherUser,
      lastUpdated: Date.now(),
    };
    await mmkvStorageAsync.setItem(key, JSON.stringify(data));

    // Cleanup old caches if we have too many
    await cleanupOldCaches();
  } catch (error) {
    console.warn("Failed to write message cache:", error);
  }
}

/**
 * Remove cached messages for a conversation
 */
export async function clearConversationCache(
  conversationId: string,
): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${conversationId}`;
    await mmkvStorageAsync.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear message cache:", error);
  }
}

/**
 * Cleanup old caches to prevent storage bloat
 */
async function cleanupOldCaches(): Promise<void> {
  try {
    const keys = await mmkvStorageAsync.getAllKeys();
    const cacheKeys = keys.filter((k: string) => k.startsWith(CACHE_PREFIX));

    if (cacheKeys.length <= MAX_CACHED_CONVERSATIONS) return;

    // Get all cached data with timestamps
    const caches = await Promise.all(
      cacheKeys.map(async (key: string) => {
        const data = await mmkvStorageAsync.getItem(key);
        if (!data) return null;
        const parsed = JSON.parse(data) as CachedConversation;
        return { key, lastUpdated: parsed.lastUpdated };
      }),
    );

    // Sort by oldest first and remove extras
    const validCaches = caches.filter(
      (c): c is { key: string; lastUpdated: number } => c !== null,
    );
    validCaches.sort((a, b) => a.lastUpdated - b.lastUpdated);

    const toRemove = validCaches.slice(
      0,
      validCaches.length - MAX_CACHED_CONVERSATIONS,
    );
    await Promise.all(toRemove.map((c) => mmkvStorageAsync.removeItem(c.key)));
  } catch (error) {
    console.warn("Failed to cleanup message caches:", error);
  }
}

/**
 * Clear all message caches (e.g., on logout)
 */
export async function clearAllMessageCaches(): Promise<void> {
  try {
    const keys = await mmkvStorageAsync.getAllKeys();
    const cacheKeys = keys.filter((k: string) => k.startsWith(CACHE_PREFIX));
    await Promise.all(cacheKeys.map((k) => mmkvStorageAsync.removeItem(k)));
  } catch (error) {
    console.warn("Failed to clear all message caches:", error);
  }
}
