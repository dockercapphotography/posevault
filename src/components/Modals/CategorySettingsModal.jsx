import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, FileText, Lock, AlertTriangle, Trash2, ImagePlus, Tag, Plus, Move } from 'lucide-react';
import { verifyPassword } from '../../utils/crypto';

export default function CategorySettingsModal({ category, allGalleryTags = [], onClose, onSave, onUploadCover, onDelete }) {
  const [name, setName] = useState(category?.name || '');
  const [notes, setNotes] = useState(category?.notes || '');
  const [tags, setTags] = useState(category?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(category?.isPrivate || false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordAction, setPasswordAction] = useState('change'); // 'change' | 'remove'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [coverPreview, setCoverPreview] = useState(null);
  const [hasCoverChanged, setHasCoverChanged] = useState(false);
  const coverInputRef = useRef(null);

  // Cover reposition state
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [coverPositionY, setCoverPositionY] = useState(category?.coverPositionY ?? 50);
  const [tempPositionY, setTempPositionY] = useState(category?.coverPositionY ?? 50);
  const repositionContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartPositionRef = useRef(50);

  const hasExistingPassword = category?.privatePassword;

  // Initialize cover preview when category changes
  useEffect(() => {
    setCoverPreview(category?.cover || null);
    setHasCoverChanged(false);
  }, [category]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a category name');
      return;
    }

    // If changing or removing password, verify current password against hash
    if (hasExistingPassword && showPasswordSection) {
      const isValid = await verifyPassword(currentPassword, category.privatePassword);
      if (!isValid) {
        setError('Current password is incorrect');
        return;
      }

      if (passwordAction === 'change') {
        if (newPassword && newPassword !== confirmPassword) {
          setError('New passwords do not match');
          return;
        }
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
      tags,
      isPrivate,
      coverPositionY,
    };

    if (showPasswordSection) {
      if (passwordAction === 'remove') {
        // Clear the password
        updates.privatePassword = null;
      } else if (newPassword) {
        // Set or change password (plain text to be hashed by caller)
        updates.privatePassword = newPassword;
      }
    }

    onSave(category.id, updates);
  };

  if (!category) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings size={24} className="text-purple-500" />
            Gallery Settings
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
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            maxLength={256}
          />
        </div>

        {/* Cover Photo */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
            <ImagePlus size={16} />
            Cover Photo
          </label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadCover(e, category.id);
                setHasCoverChanged(true);
                // Update preview with the selected file immediately
                const reader = new FileReader();
                reader.onload = (event) => {
                  setCoverPreview(event.target.result);
                };
                reader.readAsDataURL(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          {coverPreview ? (
            <div className="relative">
              <img
                src={coverPreview}
                alt="Cover preview"
                className="w-full h-32 object-cover rounded-lg"
                style={{ objectPosition: `center ${coverPositionY}%` }}
              />
              {hasCoverChanged && (
                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                  Uploading...
                </div>
              )}
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={() => {
                    setTempPositionY(coverPositionY);
                    setIsRepositioning(true);
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Move size={12} />
                  Reposition
                </button>
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors cursor-pointer"
                >
                  Change
                </button>
                <button
                  onClick={() => {
                    setCoverPreview(null);
                    setHasCoverChanged(false);
                    setCoverPositionY(50);
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

        {/* Gallery Notes */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <FileText size={16} />
            Gallery Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this gallery..."
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[100px]"
            autoComplete="one-time-code"
          />
        </div>

        {/* Gallery Tags */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Tag size={16} />
            Gallery Tags
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
            {tags.length === 0 && (
              <p className="text-gray-400 text-sm">No tags added yet</p>
            )}
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
                Marks the gallery as private and requires confirmation before opening. Can be combined with Password Protection for full security.
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
              <div className="flex gap-3">
                <button
                  onClick={() => { setPasswordAction('change'); setShowPasswordSection(true); }}
                  className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer"
                >
                  {hasExistingPassword ? 'Change Password' : 'Set Password'}
                </button>
                {hasExistingPassword && (
                  <button
                    onClick={() => { setPasswordAction('remove'); setShowPasswordSection(true); }}
                    className="text-sm text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Remove Password
                  </button>
                )}
              </div>
            )}

            {showPasswordSection && passwordAction === 'remove' && (
              <div>
                <div className="mb-3 p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
                  <p className="text-xs text-red-200 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Remove Password:</strong> Enter the current password to confirm removal. The gallery will remain private but no longer require a password to open.
                    </span>
                  </p>
                </div>

                <div className="mb-3">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Current password"
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <button
                  onClick={() => {
                    setShowPasswordSection(false);
                    setPasswordAction('change');
                    setCurrentPassword('');
                    setError('');
                  }}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {showPasswordSection && passwordAction === 'change' && (
              <div>
                <div className="mb-3 p-3 bg-orange-900/20 border border-orange-600/50 rounded-lg">
                  <p className="text-xs text-orange-200 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Warning:</strong> {hasExistingPassword
                        ? 'You must know the current password to change it. There is no password recovery option.'
                        : 'Once set, you cannot change or remove the password without knowing it. There is NO password recovery option.'}
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
                    setPasswordAction('change');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors cursor-pointer"
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

        {/* Delete Gallery Section */}
        <div className="mb-4 p-4 bg-red-900/20 border border-red-600/50 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400 mb-1">Delete Gallery</h3>
              <p className="text-xs text-gray-400">
                Permanently delete this gallery and all its images. This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={() => onDelete(category.id)}
            className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 text-white font-medium"
          >
            <Trash2 size={16} />
            Delete Gallery
          </button>
        </div>

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

      {/* Cover Reposition Overlay */}
      {isRepositioning && coverPreview && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col">
          {/* Header */}
          <div className="p-4 bg-gray-900/80">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Move size={18} />
                Reposition Cover Photo
              </h3>
              <p className="text-gray-400 text-sm hidden sm:block">Drag the image up or down</p>
            </div>
          </div>

          {/* Drag area */}
          <div
            ref={repositionContainerRef}
            className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none px-4"
            onMouseDown={(e) => {
              e.preventDefault();
              isDraggingRef.current = true;
              dragStartYRef.current = e.clientY;
              dragStartPositionRef.current = tempPositionY;
            }}
            onMouseMove={(e) => {
              if (!isDraggingRef.current) return;
              const container = repositionContainerRef.current;
              if (!container) return;
              const deltaY = e.clientY - dragStartYRef.current;
              const containerHeight = container.clientHeight;
              // Moving mouse down = image moves up = position % increases
              const deltaPercent = (deltaY / containerHeight) * 100;
              const newPosition = Math.max(0, Math.min(100, dragStartPositionRef.current + deltaPercent));
              setTempPositionY(Math.round(newPosition));
            }}
            onMouseUp={() => { isDraggingRef.current = false; }}
            onMouseLeave={() => { isDraggingRef.current = false; }}
            onTouchStart={(e) => {
              isDraggingRef.current = true;
              dragStartYRef.current = e.touches[0].clientY;
              dragStartPositionRef.current = tempPositionY;
            }}
            onTouchMove={(e) => {
              if (!isDraggingRef.current) return;
              e.preventDefault();
              const container = repositionContainerRef.current;
              if (!container) return;
              const deltaY = e.touches[0].clientY - dragStartYRef.current;
              const containerHeight = container.clientHeight;
              const deltaPercent = (deltaY / containerHeight) * 100;
              const newPosition = Math.max(0, Math.min(100, dragStartPositionRef.current + deltaPercent));
              setTempPositionY(Math.round(newPosition));
            }}
            onTouchEnd={() => { isDraggingRef.current = false; }}
          >
            <div className="w-full max-w-2xl aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/20">
              <img
                src={coverPreview}
                alt="Reposition cover"
                className="w-full h-full object-cover pointer-events-none"
                style={{ objectPosition: `center ${tempPositionY}%` }}
                draggable={false}
              />
            </div>
          </div>

          {/* Hint text for mobile */}
          <p className="text-gray-400 text-sm text-center py-2 sm:hidden">Drag the image up or down</p>

          {/* Footer buttons */}
          <div className="p-4 bg-gray-900/80">
            <div className="flex gap-3 max-w-2xl mx-auto">
            <button
              onClick={() => {
                setTempPositionY(coverPositionY);
                setIsRepositioning(false);
              }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setTempPositionY(50);
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors cursor-pointer text-sm"
            >
              Reset
            </button>
            <button
              onClick={() => {
                setCoverPositionY(tempPositionY);
                setIsRepositioning(false);
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Apply
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
