// Safe LocalStorage, IndexedDB, and In-Memory Fallback Cache Manager
// Prevents QuotaExceededError crashes when storing large student, GTK, Pangkat, or KGB datasets

const memoryStore = new Map<string, string>();

// Only truly disposable keys can be purged if localStorage quota is tight
const PURGEABLE_KEYS = [
  'dapodik_cached_attendance',
  'dapodik_cached_mutasi_masuk'
];

/**
 * IndexedDB helper for robust large-dataset persistence (up to hundreds of MBs)
 */
const DB_NAME = 'DapodikAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_keyval';

let idbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
}

export async function idbSet<T = any>(key: string, val: T): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(val, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // silently fail
  }
}

export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Compact student object to essential fields when storing in localStorage
 */
function compactObject(item: any): any {
  if (!item || typeof item !== 'object') return item;
  const res: Record<string, any> = {};
  for (const k of Object.keys(item)) {
    const v = item[k];
    if (v !== '' && v !== null && v !== undefined) {
      res[k] = v;
    }
  }
  return res;
}

/**
 * Attempts to free up localStorage space by removing disposable temporary items
 */
function freeStorageSpace(excludeKey?: string) {
  try {
    for (const key of PURGEABLE_KEYS) {
      if (key !== excludeKey && typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) {
          memoryStore.set(key, val);
          window.localStorage.removeItem(key);
          break;
        }
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Safely saves data to localStorage and IndexedDB with automatic QuotaExceededError recovery
 */
export function safeSetItem<T = any>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;

  let serialized: string;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (e) {
    console.warn(`[Storage] Failed to serialize value for key "${key}":`, e);
    return false;
  }

  // 1. Keep in memory store for instant fast retrieval in session
  memoryStore.set(key, serialized);

  // 2. Persist to IndexedDB asynchronously (no 5MB quota limit, survives reload)
  idbSet(key, value).catch(() => {});

  // 3. Persist to localStorage
  try {
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      freeStorageSpace(key);

      // Try compacting if array of objects (remove empty strings)
      if (Array.isArray(value)) {
        try {
          const compacted = value.map(compactObject);
          const compactStr = JSON.stringify(compacted);
          window.localStorage.setItem(key, compactStr);
          return true;
        } catch (compactErr) {
          // If still quota exceeded, keep essential metadata flag
          console.warn(`[Storage] LocalStorage quota reached for "${key}". Saved to IndexedDB & memory.`);
          return false;
        }
      }
      return false;
    } else {
      console.warn(`[Storage] Unable to save key "${key}" to localStorage:`, err);
      return false;
    }
  }
}

/**
 * Safely retrieves and parses data from localStorage or in-memory fallback
 */
export function safeGetItem<T = any>(key: string, fallbackValue: T): T {
  if (typeof window === 'undefined') return fallbackValue;

  try {
    const item = window.localStorage.getItem(key);
    if (item !== null && item !== undefined && item !== '') {
      memoryStore.set(key, item);
      try {
        const parsed = JSON.parse(item);
        if (parsed !== null && parsed !== undefined) return parsed as T;
      } catch {
        return item as unknown as T;
      }
    }
  } catch (e) {
    // Fall back
  }

  // Check memoryStore
  if (memoryStore.has(key)) {
    const memItem = memoryStore.get(key)!;
    try {
      return JSON.parse(memItem) as T;
    } catch {
      return memItem as unknown as T;
    }
  }

  return fallbackValue;
}

/**
 * Safely removes an item from both localStorage and memory store
 */
export function safeRemoveItem(key: string): void {
  memoryStore.delete(key);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    // Ignore error
  }
}
