import React, { useState } from 'react';
import { X, Tag, FileText, Heart, Plus } from 'lucide-react';

export default function BulkEditModal({
  selectedCount,
  selectedImages,
  allTags,
  onClose,
  onApply
}) {
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState([]);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkNotesMode, setBulkNotesMode] = useState('append');
  const [bulkFavoriteAction, setBulkFavoriteAction] = useState('noChange');

  // Extract unique existing tags from selected images
  const existingTags = React.useMemo(() => {
    if (!selectedImages || selectedImages.length === 0) return [];
    const tagSet = new Set();
    selectedImages.forEach(image => {
      if (image.tags && Array.isArray(image.tags)) {
        image.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [selectedImages]);

  const handleApply = () => {
    onApply({
      tags: bulkTagsToAdd,
      notes: bulkNotes,
      notesMode: bulkNotesMode,
      favoriteAction: bulkFavoriteAction
    });
    onClose();
  };

  // Get filtered tag suggestions
  const getTagSuggestions = () => {
    if (!bulkTagInput.trim()) return [];
    const unusedTags = allTags.filter(tag => !bulkTagsToAdd.includes(tag));
    return unusedTags.filter(tag => 
      tag.toLowerCase().includes(bulkTagInput.toLowerCase())
    ).slice(0, 5);
  };

  const suggestions = getTagSuggestions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Bulk Edit {selectedCount} Image{selectedCount > 1 ? 's' : ''}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Add Tags Section */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Tag size={16} />
            Add Tags to Selected Images
          </label>

          <div className="relative">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && bulkTagInput.trim()) {
                    setBulkTagsToAdd([...bulkTagsToAdd, bulkTagInput.trim()]);
                    setBulkTagInput('');
                  }
                }}
                placeholder="Add a tag (press Enter)"
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                onClick={() => {
                  if (bulkTagInput.trim()) {
                    setBulkTagsToAdd([...bulkTagsToAdd, bulkTagInput.trim()]);
                    setBulkTagInput('');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Autocomplete Suggestions Dropdown */}
            {bulkTagInput && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-gray-700 rounded-lg shadow-xl border border-gray-600 max-h-48 overflow-y-auto mb-2">
                {suggestions.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setBulkTagsToAdd([...bulkTagsToAdd, tag]);
                      setBulkTagInput('');
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

          {/* Existing tags section */}
          {existingTags.length > 0 && (
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-400 mb-2 block">
                Existing tags
              </label>
              <div className="flex flex-wrap gap-2">
                {existingTags.map((tag, i) => (
                  <span key={i} className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {bulkTagsToAdd.map((tag, i) => (
              <span key={i} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {tag}
                <button
                  onClick={() => setBulkTagsToAdd(bulkTagsToAdd.filter((_, idx) => idx !== i))}
                  className="hover:bg-purple-700 rounded-full p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {bulkTagsToAdd.length === 0 && (
              <p className="text-gray-400 text-sm">No tags to add yet</p>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <FileText size={16} />
            Update Notes
          </label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setBulkNotesMode('append')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                bulkNotesMode === 'append'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Append Notes
            </button>
            <button
              onClick={() => setBulkNotesMode('replace')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                bulkNotesMode === 'replace'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Replace Notes
            </button>
          </div>
          <textarea
            value={bulkNotes}
            onChange={(e) => setBulkNotes(e.target.value)}
            placeholder={bulkNotesMode === 'append' ? 'Text to append to existing notes' : 'New notes to replace existing'}
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[100px]"
          />
        </div>

        {/* Favorites Section */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Heart size={16} />
            Favorite Status
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkFavoriteAction('noChange')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                bulkFavoriteAction === 'noChange'
                  ? 'bg-gray-600 hover:bg-gray-500'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              No Change
            </button>
            <button
              onClick={() => setBulkFavoriteAction('favorite')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                bulkFavoriteAction === 'favorite'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Mark as Favorite
            </button>
            <button
              onClick={() => setBulkFavoriteAction('unfavorite')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                bulkFavoriteAction === 'unfavorite'
                  ? 'bg-gray-600 hover:bg-gray-500'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Remove Favorite
            </button>
          </div>
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
            onClick={handleApply}
            className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
