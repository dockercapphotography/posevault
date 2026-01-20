// Storage estimation and quota utilities

/**
 * Get storage quota and usage information
 * @returns {Promise<Object>} Storage information with usage, quota, and percentage
 */
export const getStorageEstimate = async () => {
  try {
    // Use Storage API if available (modern browsers)
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

      // Check if storage is persisted
      let isPersisted = false;
      if (navigator.storage && navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }

      console.log('Storage API Data:', {
        usage: `${(usage / (1024 * 1024)).toFixed(2)}MB`,
        quota: `${(quota / (1024 * 1024)).toFixed(2)}MB`,
        percentUsed: `${percentUsed.toFixed(2)}%`,
        isPersisted
      });

      return {
        usage,
        quota,
        percentUsed,
        usageMB: (usage / (1024 * 1024)).toFixed(2),
        quotaMB: (quota / (1024 * 1024)).toFixed(2),
        available: quota - usage,
        availableMB: ((quota - usage) / (1024 * 1024)).toFixed(2),
        isPersisted
      };
    }

    // Fallback: Try to estimate from IndexedDB
    console.warn('Storage API not available - app must be accessed via HTTPS or localhost for accurate storage info');
    const dbEstimate = await estimateIndexedDBSize();
    return dbEstimate;
  } catch (error) {
    console.error('Error estimating storage:', error);
    return {
      usage: 0,
      quota: 0,
      percentUsed: 0,
      usageMB: '0.00',
      quotaMB: 'Unknown',
      available: 0,
      availableMB: 'Unknown',
      error: true
    };
  }
};

/**
 * Estimate IndexedDB size by reading all data
 * @returns {Promise<Object>} Estimated storage information
 */
const estimateIndexedDBSize = async () => {
  try {
    const DB_NAME = 'PoseVaultDB';
    const STORE_NAME = 'posevault_data';

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME);

      request.onsuccess = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          resolve({
            usage: 0,
            quota: 0,
            percentUsed: 0,
            usageMB: '0.00',
            quotaMB: 'Unknown',
            available: 0,
            availableMB: 'Unknown'
          });
          return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = () => {
          const allData = getAllRequest.result;

          // Estimate size by converting to JSON
          let estimatedSize = 0;
          allData.forEach(item => {
            if (item.value) {
              estimatedSize += item.value.length;
            }
          });

          // Assume a realistic quota for modern mobile devices
          // Chrome typically allocates ~6-10% of available storage
          // Using 300MB as a reasonable estimate for mobile devices
          const assumedQuota = 300 * 1024 * 1024;
          const percentUsed = (estimatedSize / assumedQuota) * 100;

          resolve({
            usage: estimatedSize,
            quota: assumedQuota,
            percentUsed,
            usageMB: (estimatedSize / (1024 * 1024)).toFixed(2),
            quotaMB: (assumedQuota / (1024 * 1024)).toFixed(0),
            available: assumedQuota - estimatedSize,
            availableMB: ((assumedQuota - estimatedSize) / (1024 * 1024)).toFixed(2),
            estimated: true,
            insecureContext: true
          });
        };

        getAllRequest.onerror = () => {
          resolve({
            usage: 0,
            quota: 0,
            percentUsed: 0,
            usageMB: '0.00',
            quotaMB: 'Unknown',
            available: 0,
            availableMB: 'Unknown',
            error: true
          });
        };
      };

      request.onerror = () => {
        resolve({
          usage: 0,
          quota: 0,
          percentUsed: 0,
          usageMB: '0.00',
          quotaMB: 'Unknown',
          available: 0,
          availableMB: 'Unknown',
          error: true
        });
      };
    });
  } catch (error) {
    console.error('Error estimating IndexedDB size:', error);
    return {
      usage: 0,
      quota: 0,
      percentUsed: 0,
      usageMB: '0.00',
      quotaMB: 'Unknown',
      available: 0,
      availableMB: 'Unknown',
      error: true
    };
  }
};

/**
 * Get a color based on storage usage percentage
 * @param {number} percentUsed - Percentage of storage used
 * @returns {string} Color class or hex code
 */
export const getStorageColor = (percentUsed) => {
  if (percentUsed < 50) return 'text-green-500';
  if (percentUsed < 75) return 'text-yellow-500';
  if (percentUsed < 90) return 'text-orange-500';
  return 'text-red-500';
};

/**
 * Get storage status message
 * @param {number} percentUsed - Percentage of storage used
 * @returns {string} Status message
 */
export const getStorageStatus = (percentUsed) => {
  if (percentUsed < 50) return 'Good';
  if (percentUsed < 75) return 'Moderate';
  if (percentUsed < 90) return 'High';
  return 'Critical';
};

/**
 * Request persistent storage to prevent data eviction and potentially increase quota
 * @returns {Promise<boolean>} Whether persistent storage was granted
 */
export const requestPersistentStorage = async () => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log('Persistent storage request result:', isPersisted);
      return isPersisted;
    }
    return false;
  } catch (error) {
    console.error('Error requesting persistent storage:', error);
    return false;
  }
};
