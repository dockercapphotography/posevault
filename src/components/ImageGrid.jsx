import React, { useRef, useState } from 'react';
import { Heart, Grid3x3, ChevronDown, Filter, CopyCheck, CopyX, SquarePen, Images, Upload, Search, X as XIcon } from 'lucide-react';
import ImageCard from './ImageCard';
import { getGridColsClass } from '../utils/helpers';

export default function ImageGrid({
  category,
  images,
  originalImages,
  displayedToOriginalIndex,
  gridColumns,
  showGridDropdown,
  sortBy,
  showFavoritesOnly,
  selectedTagFilters,
  searchTerm,
  bulkSelectMode,
  selectedImages,
  dropdownRef,
  onUploadImages,
  onShowMobileUpload,
  onSetSortBy,
  onShowTagFilter,
  onSearchChange,
  onToggleBulkSelect,
  onShowBulkEdit,
  onToggleGridDropdown,
  onSetGridColumns,
  onImageClick,
  onToggleFavorite,
  onCommentClick,
  onEditImage,
  onDeleteImage,
  onStartBulkSelect
}) {
  const gridColsClass = getGridColsClass(gridColumns);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!e.dataTransfer.files?.length) return;
    onUploadImages({ target: { files: e.dataTransfer.files } }, category.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Detect mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;
  };

  // Handle upload button click - show modal on mobile, trigger file input on desktop
  const handleUploadClick = () => {
    if (isMobile() && onShowMobileUpload) {
      onShowMobileUpload(category.id);
    } else {
      fileInputRef.current?.click();
    }
  };

  if (!category) return null;

  if (category.images.length === 0) {
    return (
      <div
        className="p-6 max-w-6xl mx-auto relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragOver && (
          <div className="fixed inset-0 z-50 bg-blue-600/20 border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
            <div className="bg-gray-900/90 rounded-xl px-8 py-6 text-center shadow-2xl">
              <Upload size={48} className="text-blue-400 mx-auto mb-3" />
              <p className="text-lg font-semibold">Drop images to upload</p>
            </div>
          </div>
        )}
        <div className="text-center py-20 text-gray-400">
          <Upload size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No poses in this category yet</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif"
            onChange={(e) => onUploadImages(e, category.id)}
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            className="mt-4 px-6 py-3 rounded-lg inline-flex items-center gap-2 text-white cursor-pointer"
            style={{
              background: 'linear-gradient(to right, #2563eb, #3b82f6)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #1d4ed8, #2563eb)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #2563eb, #3b82f6)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }}
          >
            <Images size={20} />
            <span>Upload Poses</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-6 max-w-6xl mx-auto relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {dragOver && (
        <div className="fixed inset-0 z-50 bg-blue-600/20 border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900/90 rounded-xl px-8 py-6 text-center shadow-2xl">
            <Upload size={48} className="text-blue-400 mx-auto mb-3" />
            <p className="text-lg font-semibold">Drop images to upload</p>
          </div>
        </div>
      )}
      <div className="tutorial-filter-section mb-4 flex flex-wrap items-center gap-3">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search poses..."
            className="w-full bg-gray-700 text-white pl-10 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <XIcon size={18} />
            </button>
          )}
        </div>

        {/* Combined Filter Button */}
        <button
          onClick={onShowTagFilter}
          className={`px-2 md:px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer relative ${
            selectedTagFilters && selectedTagFilters.length > 0
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <Filter size={20} />
          <span className="hidden md:inline">
            {selectedTagFilters && selectedTagFilters.length > 0
              ? `Filter (${selectedTagFilters.length})`
              : 'Filter & Sort'}
          </span>
          {selectedTagFilters && selectedTagFilters.length > 0 && (
            <span className="md:hidden absolute -top-1 -right-1 bg-white text-purple-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedTagFilters.length}
            </span>
          )}
        </button>

        {/* Bulk Select Button */}
        <button
          onClick={onToggleBulkSelect}
          className={`px-2 md:px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer ${
            bulkSelectMode
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {bulkSelectMode ? <CopyX size={20} /> : <CopyCheck size={20} />}
          <span className="hidden md:inline">{bulkSelectMode ? 'Cancel' : 'Bulk Select'}</span>
        </button>

        {/* Bulk Edit Button (shown when images selected) */}
        {bulkSelectMode && selectedImages.length > 0 && (
          <button
            onClick={onShowBulkEdit}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 inline-flex items-center gap-2 transition-colors cursor-pointer relative"
          >
            <SquarePen size={20} />
            <span className="hidden md:inline">Edit ({selectedImages.length})</span>
            <span className="md:hidden absolute -top-1 -right-1 bg-white text-green-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedImages.length}
            </span>
          </button>
        )}

        {/* Column selector - hidden on mobile when bulk editing */}
        <div
          className={`tutorial-grid-columns relative ml-auto ${bulkSelectMode && selectedImages.length > 0 ? 'hidden md:block' : ''}`}
          ref={dropdownRef}
        >
          <button
            onClick={onToggleGridDropdown}
            className="px-2 md:px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Grid3x3 size={20} />
            <span className="hidden md:inline">{gridColumns} Columns</span>
            <ChevronDown size={16} className="hidden md:inline" />
          </button>

          {showGridDropdown && (
            <div className="absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-10 min-w-[140px]">
              {[2, 3, 4].map(cols => (
                <button
                  key={cols}
                  onClick={() => onSetGridColumns(cols)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap ${
                    gridColumns === cols ? 'bg-gray-700 text-purple-400' : ''
                  } ${cols === 4 ? 'hidden md:block' : ''}`}
                >
                  {cols} Columns
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Heart size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No poses match the current filters</p>
          <p className="text-sm mt-2">Try adjusting your filters or add more poses</p>
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-4`}>
          {images.map((img, idx) => {
            const originalIndex = displayedToOriginalIndex ? displayedToOriginalIndex[idx] : originalImages.indexOf(img);
            const isSelected = selectedImages.includes(originalIndex);
            const isFirstImage = idx === 0;
            return (
              <div key={originalIndex} className={isFirstImage ? 'tutorial-image-card' : ''}>
                <ImageCard
                  image={img}
                  index={idx}
                  originalIndex={originalIndex}
                  isSelected={isSelected}
                  bulkSelectMode={bulkSelectMode}
                  onImageClick={onImageClick}
                  onToggleFavorite={onToggleFavorite}
                  onCommentClick={onCommentClick}
                  onEdit={onEditImage}
                  onDelete={onDeleteImage}
                  onStartBulkSelect={onStartBulkSelect}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
