import React from 'react';
import { X, CheckCheck, Eye, Heart, Upload, MessageCircle, Clock, Trash2, Bell, Settings } from 'lucide-react';

const TYPE_CONFIG = {
  view: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  favorite: { icon: Heart, color: 'text-red-400', bg: 'bg-red-400/10' },
  upload_pending: { icon: Upload, color: 'text-green-400', bg: 'bg-green-400/10' },
  comment: { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  share_expired: { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
};

function formatTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationFeed({ notifications, unreadCount, onMarkRead, onMarkAllRead, onDelete, onClearRead, onClose, onOpenSettings }) {
  const hasUnread = unreadCount > 0;
  const hasRead = notifications.some(n => n.is_read);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="font-semibold text-sm">
          Notifications
          {hasUnread && (
            <span className="ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {unreadCount}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <button
              onClick={onMarkAllRead}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-white"
              title="Mark all as read"
            >
              <CheckCheck size={16} />
            </button>
          )}
          {hasRead && (
            <button
              onClick={onClearRead}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-white"
              title="Clear read notifications"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-[60vh] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No notifications yet</p>
            <p className="text-gray-600 text-xs mt-1">Activity from shared galleries will appear here</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Footer with settings link */}
      {onOpenSettings && (
        <div className="border-t border-gray-700 px-4 py-2.5">
          <button
            onClick={() => { onOpenSettings(); onClose(); }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <Settings size={12} />
            Notification Settings
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, onMarkRead, onDelete }) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.view;
  const Icon = config.icon;
  const viewerName = notification.share_viewers?.display_name;

  return (
    <div
      className={`px-4 py-3 border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer group ${
        !notification.is_read ? 'bg-gray-750/50' : ''
      }`}
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
      }}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center mt-0.5`}>
          <Icon size={14} className={config.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${!notification.is_read ? 'text-white' : 'text-gray-300'}`}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-gray-500">{formatTimeAgo(notification.created_at)}</span>
            {!notification.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            )}
          </div>
        </div>

        {/* Actions (visible on hover) */}
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
          {!notification.is_read && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
              className="p-1 hover:bg-gray-600 rounded transition-colors cursor-pointer"
              title="Mark as read"
            >
              <Eye size={12} className="text-gray-400" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
            className="p-1 hover:bg-gray-600 rounded transition-colors cursor-pointer"
            title="Remove"
          >
            <X size={12} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
