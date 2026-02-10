import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, FileText, Calendar, Plus, Type, HardDrive } from 'lucide-react';

export default function ImageEditModal({
  image,
  imageIndex,
  categoryId,
  allTags,
  onClose,
  onUpdateTags,
  onUpdateNotes,
  onUpdatePoseName,
  onUpdate, // New combined update function
  onForceSave
}) {
  const [tagInput, setTagInput] = useState('');
  const [localNotes, setLocalNotes] = useState('');
  const [localTags, setLocalTags] = useState([]);
  const [localPoseName, setLocalPoseName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize local state from image prop when modal opens
    // Since we're not saving immediately on tag changes, this only runs when the modal first opens
    if (image && !isSaving) {
      setLocalNotes(image.notes || '');
      setLocalTags(image.tags || []);
      setLocalPoseName(image.poseName || '');
      setTagInput('');
    }
  }, [image?.dateAdded, isSaving]); // Use dateAdded as a stable identifier instead of image object

  const handleAddTag = (tag) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !localTags.includes(normalized)) {
      const newTags = [...localTags, normalized];
      setLocalTags(newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagIndex) => {
    const newTags = localTags.filter((_, i) => i !== tagIndex);
    setLocalTags(newTags);
    // Don't save immediately - wait for user to click Save button
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Use the combined update function to save all changes at once
    // This prevents multiple re-renders and ensures data consistency
    if (onUpdate) {
      onUpdate(categoryId, imageIndex, {
        tags: localTags,
        notes: localNotes,
        poseName: localPoseName
      });
    } else {
      // Fallback to individual updates if onUpdate not available
      onUpdateTags(categoryId, imageIndex, localTags);
      onUpdateNotes(categoryId, imageIndex, localNotes);
      if (onUpdatePoseName) {
        onUpdatePoseName(categoryId, imageIndex, localPoseName);
      }
    }

    // Wait for debounced save
    await new Promise(resolve => setTimeout(resolve, 700));

    setIsSaving(false);
    onClose();
  };

  // Get filtered tag suggestions
  const getTagSuggestions = () => {
    if (!tagInput.trim()) return [];
    const unusedTags = allTags.filter(tag => !localTags.includes(tag));
    return unusedTags.filter(tag => 
      tag.toLowerCase().includes(tagInput.toLowerCase())
    ).slice(0, 5);
  };

  const suggestions = getTagSuggestions();

  if (!image) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Pose Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Pose Name Section */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Type size={16} />
            Pose Name
          </label>
          <input
            type="text"
            value={localPoseName}
            onChange={(e) => setLocalPoseName(e.target.value)}
            placeholder="Enter a name for this pose (e.g., Standing Profile, Action Shot)"
            maxLength={256}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        {/* Image Preview */}
        <div className="mb-6">
          <img
            src={image.src}
            alt="Pose preview"
            className="w-full h-64 object-contain bg-gray-900 rounded-lg"
          />
        </div>

        {/* Date Added & File Size */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>
              {image.dateAdded
                ? `Added ${new Date(image.dateAdded).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}`
                : 'Date not available'}
            </span>
          </div>
          {image.size > 0 && (
            <div className="flex items-center gap-2">
              <HardDrive size={16} />
              <span>
                {image.size >= 1048576
                  ? `${(image.size / 1048576).toFixed(1)}mb`
                  : `${Math.round(image.size / 1024)}kb`}
              </span>
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Tag size={16} />
            Tags
          </label>
          <div className="relative">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag(tagInput)}
                placeholder="Add a tag (press Enter)"
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                onClick={() => handleAddTag(tagInput)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Autocomplete Suggestions Dropdown */}
            {tagInput && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-gray-700 rounded-lg shadow-xl border border-gray-600 max-h-48 overflow-y-auto mb-2">
                {suggestions.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => handleAddTag(tag)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Tag size={14} className="text-purple-400" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Existing Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {localTags.length > 0 ? (
              localTags.map((tag, i) => (
                <span key={i} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(i)}
                    className="hover:bg-purple-700 rounded-full p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No tags yet. Add some above!</p>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <FileText size={16} />
            Notes
          </label>
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Add notes about this pose (e.g., lighting, location, client preferences)"
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[100px]"
          />
        </div>

        {/* Action Buttons */}
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
