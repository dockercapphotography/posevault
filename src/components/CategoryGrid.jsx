import React from 'react';
import { Heart, Grid3x3, ChevronDown } from 'lucide-react';
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
  onEditSettings,
  onUploadCover,
  onDelete,
  onGeneratePDF
}) {
  const categoryGridColsClass = getCategoryGridColsClass(categoryGridColumns);

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
          {showFavoriteCategoriesOnly ? 'Show All Categories' : 'Favorite Categories Only'}
        </button>

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
          <p className="text-lg">No favorite categories yet</p>
          <p className="text-sm mt-2">Click the heart icon on categories to mark them as favorites</p>
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
              onEditSettings={onEditSettings}
              onUploadCover={onUploadCover}
              onDelete={onDelete}
              onGeneratePDF={onGeneratePDF}
            />
          ))}
        </div>
      )}
    </div>
  );
}
