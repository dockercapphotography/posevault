import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, Eye, Heart, Upload, MessageCircle, Clock, ToggleLeft, ToggleRight, Settings } from 'lucide-react';
import { getNotificationPreferences, upsertNotificationPreferences } from '../../utils/notificationApi';

const PREF_FIELDS = [
  { field: 'notify_on_view', label: 'New viewer access', description: 'When someone opens your shared gallery', icon: Eye, color: 'text-blue-400' },
  { field: 'notify_on_favorite', label: 'Image favorited', description: 'When a viewer favorites a pose', icon: Heart, color: 'text-red-400' },
  { field: 'notify_on_upload', label: 'Upload pending', description: 'When a viewer uploads a reference image', icon: Upload, color: 'text-green-400' },
  { field: 'notify_on_comment', label: 'New comment', description: 'When a viewer comments on an image', icon: MessageCircle, color: 'text-purple-400' },
  { field: 'notify_on_expiry', label: 'Share link expired', description: 'When a share link reaches its expiration date', icon: Clock, color: 'text-orange-400' },
];

export default function NotificationPreferences({ userId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [globalPrefs, setGlobalPrefs] = useState({
    notify_on_view: false,
    notify_on_favorite: true,
    notify_on_upload: true,
    notify_on_comment: true,
    notify_on_expiry: true,
    quiet_mode: false,
  });
  const [saving, setSaving] = useState(false);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [userId]);

  async function loadPrefs() {
    setLoading(true);
    const result = await getNotificationPreferences(userId);
    if (result.ok && result.global) {
      setGlobalPrefs(prev => ({ ...prev, ...result.global }));
    }
    setLoading(false);
  }

  async function handleToggle(field) {
    const newValue = !globalPrefs[field];
    setGlobalPrefs(prev => ({ ...prev, [field]: newValue }));

    setSaving(true);
    await upsertNotificationPreferences(userId, null, { [field]: newValue });
    setSaving(false);
  }

  async function handleToggleQuietMode() {
    const newValue = !globalPrefs.quiet_mode;
    setGlobalPrefs(prev => ({ ...prev, quiet_mode: newValue }));

    setSaving(true);
    await upsertNotificationPreferences(userId, null, { quiet_mode: newValue });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings size={20} className="text-blue-400" />
            Notification Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quiet Mode */}
            <div className={`rounded-lg p-4 ${globalPrefs.quiet_mode ? 'bg-orange-900/20 border border-orange-600/30' : 'bg-gray-700/50'}`}>
              <button
                onClick={handleToggleQuietMode}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    {globalPrefs.quiet_mode ? (
                      <BellOff size={16} className="text-orange-400" />
                    ) : (
                      <Bell size={16} className="text-gray-400" />
                    )}
                    <p className="font-medium text-sm">Do Not Disturb</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-6">
                    {globalPrefs.quiet_mode
                      ? 'All notifications are paused'
                      : 'Pause all notifications'}
                  </p>
                </div>
                {globalPrefs.quiet_mode ? (
                  <ToggleRight size={28} className="text-orange-400 shrink-0" />
                ) : (
                  <ToggleLeft size={28} className="text-gray-500 shrink-0" />
                )}
              </button>
            </div>

            {/* Individual notification types */}
            <div className={`bg-gray-700/50 rounded-lg p-4 space-y-3 ${globalPrefs.quiet_mode ? 'opacity-50 pointer-events-none' : ''}`}>
              <p className="font-medium text-sm mb-2">Notify me when...</p>

              {PREF_FIELDS.map(({ field, label, description, icon: Icon, color }) => (
                <button
                  key={field}
                  onClick={() => handleToggle(field)}
                  className="w-full flex items-center justify-between cursor-pointer"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={color} />
                      <p className="text-sm">{label}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-6">{description}</p>
                  </div>
                  {globalPrefs[field] ? (
                    <ToggleRight size={28} className="text-green-400 shrink-0" />
                  ) : (
                    <ToggleLeft size={28} className="text-gray-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {saving && (
              <p className="text-xs text-gray-500 text-center">Saving...</p>
            )}

            <p className="text-xs text-gray-500 text-center mt-2">
              These are your global defaults. Per-gallery overrides can be set from the Activity Dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
