import React from 'react';
import { Grid3x3, ChevronDown, Search, Filter, CheckSquare, Edit, X as XIcon, Images } from 'lucide-react';
import CategoryCard from './CategoryCard';
import { getCategoryGridColsClass } from '../utils/helpers';

export default function CategoryGrid({
  categories,
  categoryGridColumns,
  showCategoryGridDropdown,
  categoryDropdownRef,
  onToggleGridDropdown,
  onSetGridColumns,
  onOpenCategory,
  onToggleFavorite,
  onUploadImages,
  onShowMobileUpload,
  onEditSettings,
  onUploadCover,
  onDelete,
  onGeneratePDF,
  onShare,
  // Props for filtering and bulk edit
  searchTerm = '',
  onSearchChange,
  selectedTagFilters = [],
  onShowFilterModal,
  bulkSelectMode = false,
  selectedGalleries = [],
  onToggleBulkSelect,
  onSelectGallery,
  onStartBulkSelect,
  onShowBulkEdit
}) {
  const categoryGridColsClass = getCategoryGridColsClass(categoryGridColumns);
  const activeFilterCount = selectedTagFilters.length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Single-line toolbar with search and filter buttons */}
      <div className="tutorial-gallery-toolbar mb-4 flex flex-wrap items-center gap-3">
        {/* Search Box */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search galleries..."
              className="w-full bg-gray-700 text-white pl-10 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              autoComplete="one-time-code"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <XIcon size={18} />
              </button>
            )}
          </div>
        )}

        {/* Filter & Sort Button */}
        {onShowFilterModal && (
          <button
            onClick={onShowFilterModal}
            className={`px-2 md:px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer relative ${
              activeFilterCount > 0
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Filter size={20} />
            <span className="hidden md:inline">
              {activeFilterCount > 0
                ? `Filter (${activeFilterCount})`
                : 'Filter & Sort'}
            </span>
            {activeFilterCount > 0 && (
              <span className="md:hidden absolute -top-1 -right-1 bg-white text-purple-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Bulk Select toggle */}
        {onToggleBulkSelect && (
          <button
            onClick={onToggleBulkSelect}
            className={`px-2 md:px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer ${
              bulkSelectMode
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <CheckSquare size={20} />
            <span className="hidden md:inline">{bulkSelectMode ? 'Cancel' : 'Bulk Select'}</span>
          </button>
        )}

        {/* Edit button when galleries are selected */}
        {bulkSelectMode && selectedGalleries.length > 0 && onShowBulkEdit && (
          <button
            onClick={onShowBulkEdit}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 inline-flex items-center gap-2 transition-colors cursor-pointer relative"
          >
            <Edit size={20} />
            <span className="hidden md:inline">Edit ({selectedGalleries.length})</span>
            <span className="md:hidden absolute -top-1 -right-1 bg-white text-green-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedGalleries.length}
            </span>
          </button>
        )}

        {/* Column selector */}
        <div
          className={`relative ml-auto ${bulkSelectMode && selectedGalleries.length > 0 ? 'hidden md:block' : ''}`}
          ref={categoryDropdownRef}
        >
          <button
            onClick={onToggleGridDropdown}
            className="px-2 md:px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Grid3x3 size={20} />
            <span className="hidden md:inline">{categoryGridColumns} Columns</span>
            <ChevronDown size={16} className="hidden md:inline" />
          </button>

          {showCategoryGridDropdown && (
            <div className="absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
              {[1, 2, 3, 4].map(cols => {
                // Hide 1 column on desktop, hide 3-4 columns on mobile
                let hideClass = '';
                if (cols === 1) {
                  hideClass = 'md:hidden'; // Show on mobile, hide on desktop
                } else if (cols >= 3) {
                  hideClass = 'hidden md:block'; // Hide on mobile, show on desktop
                }

                return (
                  <button
                    key={cols}
                    onClick={() => onSetGridColumns(cols)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap ${
                      categoryGridColumns === cols ? 'bg-gray-700 text-purple-400' : ''
                    } ${hideClass}`}
                  >
                    {cols} Columns
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Images size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">{searchTerm || selectedTagFilters.length > 0 ? 'No galleries match your filters' : 'No galleries yet'}</p>
          <p className="text-sm mt-2">{searchTerm || selectedTagFilters.length > 0 ? 'Try adjusting your search or filters' : 'Create a new gallery to get started'}</p>
        </div>
      ) : (
        <div className={`grid ${categoryGridColsClass} gap-6`}>
          {categories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onOpen={onOpenCategory}
              onToggleFavorite={onToggleFavorite}
              onUploadImages={onUploadImages}
              onShowMobileUpload={onShowMobileUpload}
              onEditSettings={onEditSettings}
              onUploadCover={onUploadCover}
              onDelete={onDelete}
              onGeneratePDF={onGeneratePDF}
              onShare={onShare}
              bulkSelectMode={bulkSelectMode}
              isSelected={selectedGalleries.includes(cat.id)}
              onSelect={onSelectGallery}
              onStartBulkSelect={onStartBulkSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
