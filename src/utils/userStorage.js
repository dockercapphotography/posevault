import { supabase } from '../supabaseClient';

/**
 * Get user storage info from Supabase user_storage table
 */
export async function getUserStorageInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('user_storage')
      .select('current_storage, maximum_storage')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user storage:', error);
      return { ok: false, error: error.message };
    }

    if (!data) {
      // No storage record exists yet - return defaults
      return {
        ok: true,
        currentStorage: 0,
        maxStorage: 1 * 1024 * 1024 * 1024, // Default 1GB in bytes
        usedMB: 0,
        maxMB: 1024,
        availableMB: 1024,
        usedDisplay: '0.00MB',
        maxDisplay: '1.00GB',
        availableDisplay: '1.00GB',
        percentUsed: 0
      };
    }

    const currentStorage = data.current_storage || 0;
    const maxStorage = data.maximum_storage || (1 * 1024 * 1024 * 1024); // 1GB default

    // Calculate MB - use decimals for small values
    const usedMB = currentStorage / (1024 * 1024);
    const maxMB = maxStorage / (1024 * 1024);
    const availableMB = Math.max(0, maxMB - usedMB);
    const percentUsed = maxStorage > 0 ? (currentStorage / maxStorage) * 100 : 0;

    // Smart formatting function
    const formatStorage = (mb) => {
      if (mb >= 1024) {
        // Show as GB
        const gb = mb / 1024;
        return gb < 10 ? `${gb.toFixed(2)}GB` : `${gb.toFixed(1)}GB`;
      } else if (mb >= 1) {
        // Show whole MB
        return `${Math.round(mb)}MB`;
      } else if (mb >= 0.01) {
        // Show decimals for small MB values (10KB+)
        return `${mb.toFixed(2)}MB`;
      } else {
        // Show as KB for very small values
        const kb = mb * 1024;
        return kb < 1 ? `${kb.toFixed(2)}KB` : `${Math.round(kb)}KB`;
      }
    };

    return {
      ok: true,
      currentStorage,
      maxStorage,
      usedMB,
      maxMB,
      availableMB,
      usedDisplay: formatStorage(usedMB),
      maxDisplay: formatStorage(maxMB),
      availableDisplay: formatStorage(availableMB),
      percentUsed: Math.min(percentUsed, 100)
    };
  } catch (err) {
    console.error('User storage fetch exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Get storage color class based on percentage used
 */
export function getStorageColor(percentUsed) {
  if (percentUsed < 50) return 'text-green-500';
  if (percentUsed < 75) return 'text-yellow-500';
  if (percentUsed < 90) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get storage status text
 */
export function getStorageStatus(percentUsed) {
  if (percentUsed < 50) return 'Good';
  if (percentUsed < 75) return 'Fair';
  if (percentUsed < 90) return 'Low';
  return 'Critical';
}
