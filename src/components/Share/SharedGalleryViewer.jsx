import React, { useState, useMemo } from 'react';
import { Grid3x3, ChevronDown, Tag, X, Filter, Camera, Images } from 'lucide-react';
import SharedImageView from './SharedImageView';
import { getShareImageUrl } from '../../utils/shareApi';

export default function SharedGalleryViewer({ token, gallery, images, permissions, viewer }) {
  const [gridColumns, setGridColumns] = useState(3);
  const [showGridDropdown, setShowGridDropdown] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Collect all unique tags from images
  const allTags = useMemo(() => {
    const tagSet = new Set();
    images.forEach(img => {
      if (img.tags) {
        img.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [images]);

  // Filter images by selected tags
  const displayedImages = useMemo(() => {
    if (selectedTags.length === 0) return images;
    return images.filter(img =>
      img.tags && selectedTags.every(tag => img.tags.includes(tag))
    );
  }, [images, selectedTags]);

  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[gridColumns] || 'grid-cols-3';

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
  };

  if (selectedImage !== null) {
    return (
      <SharedImageView
        token={token}
        images={displayedImages}
        currentIndex={selectedImage}
        onClose={() => setSelectedImage(null)}
        onNavigate={setSelectedImage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">{gallery.name}</h1>
            <p className="text-xs text-gray-400">
              {displayedImages.length} {displayedImages.length === 1 ? 'pose' : 'poses'}
              {selectedTags.length > 0 && ` (filtered from ${images.length})`}
              {viewer && <span className="ml-2">— Viewing as {viewer.display_name}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-3">
            {/* Tag Filter Button */}
            {allTags.length > 0 && (
              <button
                onClick={() => setShowTagFilter(!showTagFilter)}
                className={`px-2 md:px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer text-sm ${
                  selectedTags.length > 0
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <Filter size={16} />
                <span className="hidden md:inline">
                  {selectedTags.length > 0 ? `Filter (${selectedTags.length})` : 'Filter'}
                </span>
              </button>
            )}

            {/* Grid Column Selector */}
            <div className="relative">
              <button
                onClick={() => setShowGridDropdown(!showGridDropdown)}
                className="px-2 md:px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer text-sm"
              >
                <Grid3x3 size={16} />
                <span className="hidden md:inline">{gridColumns}</span>
                <ChevronDown size={14} className="hidden md:inline" />
              </button>

              {showGridDropdown && (
                <div className="absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
                  {[2, 3, 4].map(cols => (
                    <button
                      key={cols}
                      onClick={() => { setGridColumns(cols); setShowGridDropdown(false); }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap text-sm ${
                        gridColumns === cols ? 'bg-gray-700 text-purple-400' : ''
                      }`}
                    >
                      {cols} Columns
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tag Filter Panel */}
        {showTagFilter && (
          <div className="border-t border-gray-800 px-4 py-3 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-semibold">Filter by Tags</p>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                    selectedTags.includes(tag)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Gallery Notes */}
      {gallery.notes && (
        <div className="max-w-6xl mx-auto px-4 py-3">
          <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg px-4 py-3">{gallery.notes}</p>
        </div>
      )}

      {/* Image Grid */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {displayedImages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Images size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {selectedTags.length > 0 ? 'No poses match your filters' : 'No poses in this gallery'}
            </p>
            {selectedTags.length > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 text-purple-400 hover:text-purple-300 text-sm cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className={`grid ${gridColsClass} gap-2 md:gap-3`}>
            {displayedImages.map((image, index) => (
              <div
                key={image.id || index}
                onClick={() => setSelectedImage(index)}
                className="relative aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
              >
                <img
                  src={getShareImageUrl(token, image.r2Key)}
                  alt={image.name || 'Pose'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />

                {/* Image name overlay */}
                {image.name && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate">{image.name}</p>
                  </div>
                )}

                {/* Tag chips */}
                {image.tags && image.tags.length > 0 && (
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {image.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {image.tags.length > 2 && (
                      <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        +{image.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-600 text-xs">
        Shared via PoseVault
      </footer>
    </div>
  );
}
