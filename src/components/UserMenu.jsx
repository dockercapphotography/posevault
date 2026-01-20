import React, { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, WifiOff, Wifi, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import StorageMeter from './StorageMeter';

/**
 * User menu dropdown containing offline status, storage meter, and logout
 */
export default function UserMenu({ onLogout, isUploading = false, isSaving = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showOnlineNotification, setShowOnlineNotification] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const menuRef = useRef(null);
  const isOnline = useOnlineStatus();

  // Handle online/offline notifications
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    }

    if (isOnline && wasOffline) {
      setShowOnlineNotification(true);
      const timer = setTimeout(() => {
        setShowOnlineNotification(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    setIsOpen(false);
    onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

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

      {/* User Menu Button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gray-700 hover:bg-gray-600 px-2 py-2 md:px-3 md:py-2 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base cursor-pointer"
          aria-label="User menu"
        >
          <Menu size={16} className="md:w-5 md:h-5" />
          <span className="hidden sm:inline">Menu</span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 z-50 w-64 sm:w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
            {/* Offline Status */}
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                {isOnline ? (
                  <>
                    <Wifi size={16} className="text-green-500" />
                    <span className="text-green-500 font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={16} className="text-orange-500" />
                    <div className="flex-1">
                      <div className="text-orange-500 font-medium">Offline Mode</div>
                      <div className="text-gray-400 text-xs mt-1">
                        Your data is saved locally
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Storage Meter */}
            <div className="px-4 py-3 border-b border-gray-700">
              <StorageMeter compact={false} pauseRefresh={isUploading || isSaving} />
            </div>

            {/* Logout Button */}
            <div className="p-2">
              <button
                onClick={handleLogoutClick}
                className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-2xl border border-gray-700">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-red-900/30 p-2 rounded-lg">
                <LogOut size={24} className="text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Logout Confirmation
                </h3>
                <p className="text-gray-400 text-sm">
                  Are you sure you want to logout? Your data is saved locally and will be available when you log back in.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
