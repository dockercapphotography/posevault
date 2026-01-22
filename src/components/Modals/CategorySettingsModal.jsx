import React, { useState, useEffect } from 'react';
import { X, Settings, FileText, Lock, AlertTriangle } from 'lucide-react';

export default function CategorySettingsModal({ category, onClose, onSave }) {
  const [name, setName] = useState(category?.name || '');
  const [notes, setNotes] = useState(category?.notes || '');
  const [isPrivate, setIsPrivate] = useState(category?.isPrivate || false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const hasExistingPassword = category?.privatePassword;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter a category name');
      return;
    }

    // If changing password, verify current password
    if (hasExistingPassword && showPasswordSection) {
      if (currentPassword !== category.privatePassword) {
        setError('Current password is incorrect');
        return;
      }
      if (newPassword && newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    // If setting new password on a category that didn't have one
    if (!hasExistingPassword && showPasswordSection && newPassword) {
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    const updates = {
      name: name.trim(),
      notes,
      isPrivate,
      privatePassword: showPasswordSection && newPassword ? newPassword : category?.privatePassword || null
    };

    onSave(category.id, updates);
  };

  if (!category) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings size={24} className="text-purple-500" />
            Category Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Category Name */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Category Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        {/* Category Notes */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <FileText size={16} />
            Category Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this category..."
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[100px]"
          />
        </div>

        {/* Private Gallery Toggle */}
        <div className="mb-4 p-4 bg-gray-700 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-orange-500" />
                <span className="font-semibold">Private Gallery</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Requires confirmation before opening. May contain NSFW content.
              </p>
            </div>
          </label>
        </div>

        {/* Password Protection */}
        {isPrivate && (
          <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Lock size={16} />
                Password Protection
              </label>
              {hasExistingPassword && (
                <span className="text-xs text-green-500">🔒 Password Set</span>
              )}
            </div>

            {!showPasswordSection && (
              <button
                onClick={() => setShowPasswordSection(true)}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                {hasExistingPassword ? 'Change Password' : 'Set Password'}
              </button>
            )}

            {showPasswordSection && (
              <div>
                <div className="mb-3 p-3 bg-orange-900/20 border border-orange-600/50 rounded-lg">
                  <p className="text-xs text-orange-200 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Warning:</strong> {hasExistingPassword 
                        ? 'You must know the current password to change it. There is no password recovery option.' 
                        : 'Once set, you cannot change or remove the password without knowing it. There is no password recovery option.'}
                    </span>
                  </p>
                </div>

                {hasExistingPassword && (
                  <div className="mb-2">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Current password"
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>
                )}

                <div className="mb-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    placeholder={hasExistingPassword ? "New password" : "Set password"}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>

                {newPassword && (
                  <div className="mb-2">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Confirm password"
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
