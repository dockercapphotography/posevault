import React from 'react';
import { Heart, Grid3x3, ChevronDown, Search, Filter, CheckSquare, Edit } from 'lucide-react';
import CategoryCard from './CategoryCard';
import { getCategoryGridColsClass } from '../utils/helpers';

export default function CategoryGrid({
  categories,
  showFavoriteCategoriesOnly,
  categoryGridColumns,
  showCategoryGridDropdown,
  categoryDropdownRef,
  onToggleShowFavorites,
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
  // New props for filtering and bulk edit
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
      {/* Search bar */}
      {onSearchChange && (
        <div className="mb-4 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search galleries..."
            className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            autoComplete="one-time-code"
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onToggleShowFavorites}
          className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer ${
            showFavoriteCategoriesOnly
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <Heart size={20} className={showFavoriteCategoriesOnly ? 'fill-white' : ''} />
          <span className="hidden md:inline">{showFavoriteCategoriesOnly ? 'Show All Galleries' : 'Favorite Galleries Only'}</span>
          <span className="md:hidden">{showFavoriteCategoriesOnly ? 'All' : 'Favorites'}</span>
        </button>

        {/* Filter button */}
        {onShowFilterModal && (
          <button
            onClick={onShowFilterModal}
            className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer ${
              activeFilterCount > 0
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Filter size={20} />
            <span className="hidden md:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-green-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Bulk Select toggle */}
        {onToggleBulkSelect && (
          <button
            onClick={onToggleBulkSelect}
            className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer ${
              bulkSelectMode
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <CheckSquare size={20} />
            <span className="hidden md:inline">{bulkSelectMode ? 'Cancel' : 'Select'}</span>
          </button>
        )}

        {/* Edit button when galleries are selected */}
        {bulkSelectMode && selectedGalleries.length > 0 && onShowBulkEdit && (
          <button
            onClick={onShowBulkEdit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Edit size={20} />
            <span className="hidden md:inline">Edit ({selectedGalleries.length})</span>
            <span className="md:hidden">{selectedGalleries.length}</span>
          </button>
        )}

        <div className="relative ml-auto" ref={categoryDropdownRef}>
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
          <Heart size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">{searchTerm || selectedTagFilters.length > 0 ? 'No galleries match your filters' : 'No favorite galleries yet'}</p>
          <p className="text-sm mt-2">{searchTerm || selectedTagFilters.length > 0 ? 'Try adjusting your search or filters' : 'Click the heart icon on galleries to mark them as favorites'}</p>
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
