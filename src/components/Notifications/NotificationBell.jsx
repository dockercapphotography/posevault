import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import NotificationFeed from './NotificationFeed';

export default function NotificationBell({ userId, unreadCount, notifications, onRefresh, onMarkRead, onMarkAllRead, onDelete, onClearRead, onOpenSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && onRefresh) onRefresh();
        }}
        className="relative p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell size={18} className="md:w-5 md:h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationFeed
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
          onDelete={onDelete}
          onClearRead={onClearRead}
          onClose={() => setIsOpen(false)}
          onOpenSettings={onOpenSettings}
        />
      )}
    </div>
  );
}
