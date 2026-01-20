import React, { useState, useEffect } from 'react';
import { HardDrive, AlertCircle } from 'lucide-react';
import { getStorageEstimate, getStorageColor, getStorageStatus } from '../utils/storageEstimate';

export default function StorageMeter({ compact = false }) {
  const [storageInfo, setStorageInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    loadStorageInfo();

    // Refresh every 30 seconds
    const interval = setInterval(loadStorageInfo, 30000);
    return () => clearInterval(interval);
  }, []);

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
    setIsLoading(true);
    const info = await getStorageEstimate();
    setStorageInfo(info);
    setIsLoading(false);
  };

  if (isLoading || !storageInfo) {
    return null;
  }

  if (storageInfo.error) {
    return null; // Don't show if there's an error
  }

  const percentUsed = Math.min(storageInfo.percentUsed, 100);
  const colorClass = getStorageColor(percentUsed);
  const status = getStorageStatus(percentUsed);

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
          {storageInfo.usageMB}MB
        </span>

        {/* Tooltip */}
        <div className={`absolute top-full left-0 mt-2 z-50 w-64 ${showTooltip ? 'block' : 'hidden group-hover:block'}`}>
          <div className="bg-gray-800 rounded-lg p-3 shadow-xl border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Storage Usage</div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white">
                {storageInfo.usageMB}MB / {storageInfo.quotaMB}MB
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
              {storageInfo.availableMB}MB available
              {storageInfo.estimated && ' (estimated)'}
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
        </div>
        <span className={`text-sm font-medium ${colorClass}`}>
          {status}
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
          <span className="text-white font-medium">{storageInfo.usageMB}MB</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Available:</span>
          <span className="text-white font-medium">{storageInfo.availableMB}MB</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Quota:</span>
          <span className="text-white font-medium">
            {storageInfo.quotaMB}MB
            {storageInfo.estimated && ' (est.)'}
          </span>
        </div>

        <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
          <span className="text-gray-400">Percentage Used:</span>
          <span className={`font-bold ${colorClass}`}>
            {percentUsed.toFixed(1)}%
          </span>
        </div>

        {/* Warning if storage is high */}
        {percentUsed > 75 && (
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
