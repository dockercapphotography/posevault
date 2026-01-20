// Storage adapter - works with window.storage (artifact mode), IndexedDB, or localStorage fallback

const DB_NAME = 'PoseVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'posevault_data';

// IndexedDB wrapper
class IndexedDBStorage {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.db) {
      return this.db;
    }

    // Create new initialization promise
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          objectStore.createIndex('key', 'key', { unique: true });
          console.log('IndexedDB object store created');
        }
      };
    });

    return this.initPromise;
  }

  async get(key) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }

  async set(key, value) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.put({ key, value });

        request.onsuccess = () => {
          resolve({ key, value });
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('IndexedDB set error:', error);
      throw error;
    }
  }

  async delete(key) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(key);

        request.onsuccess = () => {
          resolve({ key, deleted: true });
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('IndexedDB delete error:', error);
      throw error;
    }
  }

  async clear() {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.clear();

        request.onsuccess = () => {
          resolve({ cleared: true });
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      throw error;
    }
  }
}

// Create IndexedDB instance
const indexedDBStorage = new IndexedDBStorage();

// Migration flag to ensure we only migrate once per session
let migrationComplete = false;

// Migrate data from localStorage to IndexedDB
async function migrateFromLocalStorage() {
  if (migrationComplete) return;

  try {
    // Check if migration marker exists in IndexedDB
    const migrationMarker = await indexedDBStorage.get('__migration_complete__');
    if (migrationMarker && migrationMarker.value === 'true') {
      console.log('Migration already completed previously, skipping...');
      migrationComplete = true;
      return;
    }

    console.log('Checking for localStorage data to migrate...');

    // Get all localStorage keys that might be PoseVault data
    const keysToMigrate = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('categories:') || key.startsWith('users:') || key === 'currentUser')) {
        keysToMigrate.push(key);
      }
    }

    if (keysToMigrate.length > 0) {
      console.log(`Migrating ${keysToMigrate.length} items from localStorage to IndexedDB...`);

      for (const key of keysToMigrate) {
        const value = localStorage.getItem(key);
        if (value) {
          // Check if IndexedDB already has this key with data
          const existing = await indexedDBStorage.get(key);
          if (!existing) {
            await indexedDBStorage.set(key, value);
            console.log(`Migrated: ${key}`);
          } else {
            console.log(`Skipped migration for ${key} - already exists in IndexedDB`);
          }
        }
      }

      console.log('Migration complete! Clearing localStorage to prevent future overwrites...');

      // CRITICAL: Clear localStorage after migration to prevent overwriting new data
      keysToMigrate.forEach(key => localStorage.removeItem(key));
      console.log('localStorage cleared - IndexedDB is now primary storage');

      // Set migration marker so we never migrate again
      await indexedDBStorage.set('__migration_complete__', 'true');
    } else {
      // No data to migrate, just mark as complete
      await indexedDBStorage.set('__migration_complete__', 'true');
    }

    migrationComplete = true;
  } catch (error) {
    console.error('Migration from localStorage failed:', error);
  }
}

// Storage adapter with priority: window.storage > IndexedDB > localStorage
export const storage = {
  get: async (key) => {
    // First priority: Claude artifact storage API
    if (window.storage && window.storage.get) {
      return await window.storage.get(key);
    }

    // Second priority: IndexedDB (migrate if needed)
    try {
      if (!migrationComplete) {
        await migrateFromLocalStorage();
      }
      const result = await indexedDBStorage.get(key);
      return result;
    } catch (error) {
      console.error('IndexedDB failed, falling back to localStorage:', error);

      // Third priority: localStorage fallback (last resort)
      const value = localStorage.getItem(key);
      return value ? { key, value } : null;
    }
  },

  set: async (key, value) => {
    // First priority: Claude artifact storage API
    if (window.storage && window.storage.set) {
      return await window.storage.set(key, value);
    }

    // Second priority: IndexedDB (migrate if needed)
    try {
      if (!migrationComplete) {
        await migrateFromLocalStorage();
      }
      return await indexedDBStorage.set(key, value);
    } catch (error) {
      console.error('IndexedDB failed, falling back to localStorage:', error);

      // Third priority: localStorage fallback (last resort)
      try {
        localStorage.setItem(key, value);
        return { key, value };
      } catch (localStorageError) {
        console.error('localStorage quota exceeded! Consider deleting old data.', localStorageError);
        throw new Error('Storage quota exceeded. Please delete some images to free up space.');
      }
    }
  },

  delete: async (key) => {
    // First priority: Claude artifact storage API
    if (window.storage && window.storage.delete) {
      return await window.storage.delete(key);
    }

    // Second priority: IndexedDB
    try {
      return await indexedDBStorage.delete(key);
    } catch (error) {
      console.error('IndexedDB delete failed, falling back to localStorage:', error);

      // Third priority: localStorage fallback
      localStorage.removeItem(key);
      return { key, deleted: true };
    }
  },

  // Additional utility to clear all data
  clear: async () => {
    if (window.storage && window.storage.clear) {
      return await window.storage.clear();
    }

    try {
      await indexedDBStorage.clear();
      localStorage.clear();
      return { cleared: true };
    } catch (error) {
      console.error('Clear failed:', error);
      throw error;
    }
  },

  // Force clear old localStorage data (useful if migration had issues)
  clearLegacyStorage: () => {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('categories:') || key.startsWith('users:') || key === 'currentUser')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} old localStorage items`);
      return { cleared: keysToRemove.length };
    } catch (error) {
      console.error('Failed to clear legacy storage:', error);
      throw error;
    }
  }
};
