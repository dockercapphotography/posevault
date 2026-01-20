import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useState, useEffect } from 'react';

/**
 * Displays network status as an icon with tooltip
 * Shows green Wifi icon when online, orange WifiOff when offline
 * Displays temporary banner notification when coming back online
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showOnlineNotification, setShowOnlineNotification] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Track if user was offline to show "back online" message
    if (!isOnline) {
      setWasOffline(true);
      setShowTooltip(false); // Close tooltip when going offline
    }

    // When coming back online, show notification briefly
    if (isOnline && wasOffline) {
      setShowOnlineNotification(true);
      const timer = setTimeout(() => {
        setShowOnlineNotification(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;

    const handleClickOutside = (e) => {
      if (!e.target.closest('.offline-indicator-wrapper')) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showTooltip]);

  return (
    <>
      {/* Temporary "Back Online" notification banner */}
      {showOnlineNotification && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-2 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <Wifi className="w-5 h-5" />
            <span className="font-medium">Back Online</span>
          </div>
        </div>
      )}

      {/* Network status icon with tooltip */}
      <div
        className="offline-indicator-wrapper flex items-center text-sm hover:text-white transition-colors cursor-pointer relative"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
      >
        {isOnline ? (
          <Wifi size={16} className="text-green-500" />
        ) : (
          <WifiOff size={16} className="text-orange-500" />
        )}

        {/* Tooltip */}
        {showTooltip && !isOnline && (
          <div className="absolute top-full right-0 mt-2 z-50 w-56 sm:w-64 max-w-[calc(100vw-2rem)]">
            <div className="bg-gray-800 rounded-lg p-3 shadow-xl border border-gray-700">
              <div className="flex items-start gap-2">
                <WifiOff size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-white font-medium mb-1">Offline Mode</p>
                  <p className="text-gray-400 text-xs">
                    Your data is saved locally and will be available when you reconnect.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
