import React from 'react';
import { X } from 'lucide-react';

export default function TagFilterModal({ 
  categoryTags,
  selectedTagFilters,
  tagFilterMode,
  onSetFilterMode,
  onToggleTag,
  onClearFilters,
  onClose 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Filter by Tags</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Include/Exclude Toggle */}
        <div className="mb-4">
          <label className="text-sm font-semibold mb-2 block">Filter Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => onSetFilterMode('include')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                tagFilterMode === 'include'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Has These Tags
            </button>
            <button
              onClick={() => onSetFilterMode('exclude')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                tagFilterMode === 'exclude'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Doesn't Have These
            </button>
          </div>
        </div>

        {/* Tag Selection */}
        <div className="mb-6">
          <label className="text-sm font-semibold mb-2 block">Select Tags</label>
          <div className="flex flex-wrap gap-2">
            {categoryTags.map((tag, i) => {
              const isSelected = selectedTagFilters.includes(tag);
              return (
                <button
                  key={i}
                  onClick={() => onToggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    isSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {tag}
                  {isSelected && <span className="ml-1">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              onClearFilters();
              onClose();
            }}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
