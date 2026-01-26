import React, { useState, useEffect, useRef } from 'react';
import { X, FolderPlus, Lock, AlertTriangle, FileText, ImagePlus } from 'lucide-react';
import { convertToWebP } from '../../utils/imageOptimizer';

export default function NewCategoryModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privatePassword, setPrivatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const coverInputRef = useRef(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const optimized = await convertToWebP(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85
      });
      setCover(optimized);
      setCoverPreview(optimized);
    } catch (err) {
      // Fallback to original
      const reader = new FileReader();
      reader.onload = (event) => {
        setCover(event.target.result);
        setCoverPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

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
      privatePassword: isPrivate && privatePassword ? privatePassword : null,
      notes: notes.trim(),
      cover,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && name.trim() && e.target.tagName !== 'TEXTAREA') {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
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
            onKeyDown={handleKeyDown}
            placeholder="e.g., Wedding Poses, Portraits"
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            autoFocus
          />
        </div>

        {/* Cover Photo */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
            <ImagePlus size={16} />
            Cover Photo (Optional)
          </label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
          {coverPreview ? (
            <div className="relative">
              <img
                src={coverPreview}
                alt="Cover preview"
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors cursor-pointer"
                >
                  Change
                </button>
                <button
                  onClick={() => {
                    setCover(null);
                    setCoverPreview(null);
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-purple-500 transition-colors cursor-pointer"
            >
              <ImagePlus size={20} />
              <span className="text-sm">Upload Cover Photo</span>
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <FileText size={16} />
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this category..."
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[80px] resize-none"
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

            <div className="mb-3 p-3 bg-orange-900/20 border border-orange-600/50 rounded-lg">
              <p className="text-xs text-orange-200 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Warning:</strong> If you set a password, you CANNOT change or remove it without knowing the original password. There is no password recovery option. Make sure you remember it!
                </span>
              </p>
            </div>

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
