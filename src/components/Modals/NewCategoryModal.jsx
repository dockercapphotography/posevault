import React, { useState, useEffect, useRef } from 'react';
import { X, FolderPlus, Lock, AlertTriangle, FileText, ImagePlus, Tag, Plus } from 'lucide-react';
import { convertToWebP } from '../../utils/imageOptimizer';

export default function NewCategoryModal({ onClose, onAdd, allGalleryTags = [] }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
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
      tags,
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
            New Gallery
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Gallery Name */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Gallery Name</label>
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
            accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif"
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
            placeholder="Add notes about this gallery..."
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[80px] resize-none"
            autoComplete="one-time-code"
          />
        </div>

        {/* Gallery Tags */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Tag size={16} />
            Tags (Optional)
          </label>
          <div className="relative">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    const normalized = tagInput.trim().toLowerCase();
                    if (!tags.includes(normalized)) {
                      setTags([...tags, normalized]);
                    }
                    setTagInput('');
                  }
                }}
                placeholder="Add a tag (press Enter)"
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                autoComplete="one-time-code"
              />
              <button
                type="button"
                onClick={() => {
                  if (tagInput.trim()) {
                    const normalized = tagInput.trim().toLowerCase();
                    if (!tags.includes(normalized)) {
                      setTags([...tags, normalized]);
                    }
                    setTagInput('');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Autocomplete Suggestions Dropdown */}
            {tagInput && allGalleryTags.filter(t =>
              t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.toLowerCase())
            ).length > 0 && (
              <div className="absolute z-10 w-full bg-gray-700 rounded-lg shadow-xl border border-gray-600 max-h-48 overflow-y-auto mb-2">
                {allGalleryTags.filter(t =>
                  t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.toLowerCase())
                ).slice(0, 5).map((tag, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const normalized = tag.toLowerCase();
                      if (!tags.includes(normalized)) {
                        setTags([...tags, normalized]);
                      }
                      setTagInput('');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Tag size={14} className="text-purple-400" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current tags */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span key={i} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                  className="hover:bg-purple-700 rounded-full p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
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
