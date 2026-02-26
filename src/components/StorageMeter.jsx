import React, { useState, useEffect } from 'react';
import { HardDrive, AlertCircle } from 'lucide-react';
import { getUserStorageInfo, getStorageColor, getStorageStatus } from '../utils/userStorage';

export default function StorageMeter({ compact = false, pauseRefresh = false, userId }) {
  const [storageInfo, setStorageInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    loadStorageInfo();

    // Refresh every 30 seconds, but pause during uploads/saves to prevent conflicts
    const interval = setInterval(() => {
      if (!pauseRefresh) {
        loadStorageInfo();
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only re-run when userId changes, not on every pauseRefresh change

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;

    const handleClickOutside = (e) => {
      if (!e.target.closest('.storage-meter-wrapper')) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showTooltip]);

  const loadStorageInfo = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    const info = await getUserStorageInfo(userId);
    
    if (info.ok) {
      setStorageInfo(info);
    } else {
      console.error('Failed to load storage info:', info.error);
      // Show fallback defaults so the UI doesn't stay stuck in loading state
      if (!storageInfo) {
        setStorageInfo({
          ok: false,
          currentStorage: 0,
          maxStorage: 500 * 1024 * 1024,
          usedMB: 0,
          maxMB: 500,
          availableMB: 500,
          usedDisplay: '--',
          maxDisplay: '--',
          availableDisplay: '--',
          percentUsed: 0,
          tierName: '',
          tierId: 1,
        });
      }
    }
    
    setIsLoading(false);
  };

  if (isLoading || !storageInfo) {
    // Show skeleton loader instead of nothing
    if (compact) {
      return null; // Don't show compact view while loading
    }
    
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-700 rounded"></div>
            <div className="h-5 w-32 bg-gray-700 rounded"></div>
          </div>
          <div className="h-5 w-16 bg-gray-700 rounded"></div>
        </div>

        <div className="space-y-3">
          {/* Progress bar skeleton - matches h-3 */}
          <div className="w-full bg-gray-700 rounded-full h-3"></div>

          {/* Storage details skeleton - matches text-sm line height */}
          <div className="flex justify-between">
            <div className="h-5 w-16 bg-gray-700 rounded"></div>
            <div className="h-5 w-20 bg-gray-700 rounded"></div>
          </div>

          <div className="flex justify-between">
            <div className="h-5 w-20 bg-gray-700 rounded"></div>
            <div className="h-5 w-24 bg-gray-700 rounded"></div>
          </div>

          <div className="flex justify-between">
            <div className="h-5 w-12 bg-gray-700 rounded"></div>
            <div className="h-5 w-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const percentUsed = storageInfo.percentUsed;
  const colorClass = getStorageColor(percentUsed);

  // Compact view - for header or toolbar
  if (compact) {
    return (
      <div
        className="storage-meter-wrapper flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer group relative"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
      >
        <HardDrive size={16} className={percentUsed > 75 ? colorClass : ''} />
        <span className={percentUsed > 75 ? colorClass : ''}>
          {storageInfo.usedDisplay}
        </span>

        {/* Tooltip */}
        <div className={`absolute top-full right-0 mt-2 z-50 w-64 ${showTooltip ? 'block' : 'hidden group-hover:block'}`}>
          <div className="bg-gray-800 rounded-lg p-3 shadow-xl border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Storage Usage</span>
              {storageInfo.tierName && (
                <span className="text-xs font-medium text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
                  {storageInfo.tierName}
                </span>
              )}
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white">
                {storageInfo.usedDisplay} / {storageInfo.maxDisplay}
              </span>
              <span className={colorClass}>{percentUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentUsed < 50
                    ? 'bg-green-500'
                    : percentUsed < 75
                    ? 'bg-yellow-500'
                    : percentUsed < 90
                    ? 'bg-orange-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">
              {storageInfo.availableDisplay} available
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full view - for settings or modal
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive size={20} className={colorClass} />
          <h3 className="font-semibold">Storage Usage</h3>
          {storageInfo.tierName && (
            <span className="text-xs font-medium text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
              {storageInfo.tierName}
            </span>
          )}
        </div>
        <span className={`text-sm font-medium ${colorClass}`}>
          {percentUsed.toFixed(1)}%
        </span>
      </div>

      <div className="space-y-3">
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              percentUsed < 50
                ? 'bg-green-500'
                : percentUsed < 75
                ? 'bg-yellow-500'
                : percentUsed < 90
                ? 'bg-orange-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        {/* Storage details */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Used:</span>
          <span className="text-white font-medium">{storageInfo.usedDisplay}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Available:</span>
          <span className="text-white font-medium">{storageInfo.availableDisplay}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total:</span>
          <span className="text-white font-medium">{storageInfo.maxDisplay}</span>
        </div>

        {/* Warning if storage is high */}
        {percentUsed > 75 && percentUsed <= 90 && (
          <div className="flex items-start gap-2 p-3 bg-gray-900 rounded-lg border border-orange-500/30 mt-3">
            <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-orange-400 font-medium mb-1">Storage running low</p>
              <p className="text-gray-400 text-xs">
                Consider deleting unused images or categories to free up space.
              </p>
            </div>
          </div>
        )}

        {percentUsed > 90 && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 rounded-lg border border-red-500/30">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-red-400 font-medium mb-1">Critical storage level</p>
              <p className="text-gray-400 text-xs">
                You may not be able to upload new images. Delete some data immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
