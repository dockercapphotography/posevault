import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Lock, AlertTriangle } from 'lucide-react';

export default function NewCategoryModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [privatePassword, setPrivatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordWarning, setShowPasswordWarning] = useState(false);
  const [error, setError] = useState('');

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter a category name');
      return;
    }

    if (isPrivate && privatePassword && privatePassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    onAdd(name.trim(), {
      isPrivate,
      privatePassword: isPrivate && privatePassword ? privatePassword : null
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderPlus size={24} className="text-green-500" />
            New Category
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Category Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Wedding Poses, Portraits"
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            autoFocus
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

        {/* Password Protection (Optional) */}
        {isPrivate && (
          <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <label className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Lock size={16} />
              Password Protection (Optional)
            </label>
            
            {!showPasswordWarning && (
              <button
                onClick={() => setShowPasswordWarning(true)}
                className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-2 mb-3"
              >
                <AlertTriangle size={14} />
                Important: Read before setting password
              </button>
            )}

            {showPasswordWarning && (
              <div className="mb-3 p-3 bg-orange-900/20 border border-orange-600/50 rounded-lg">
                <p className="text-xs text-orange-200">
                  ⚠️ <strong>Warning:</strong> If you set a password, you CANNOT change or remove it without knowing the original password. There is no password recovery option. Make sure you remember it!
                </p>
              </div>
            )}

            <input
              type="password"
              value={privatePassword}
              onChange={(e) => {
                setPrivatePassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password (leave blank for none)"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600 mb-2"
            />

            {privatePassword && (
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
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
