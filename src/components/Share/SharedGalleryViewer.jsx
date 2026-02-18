import React, { useState, useMemo, useRef } from 'react';
import { Grid3x3, ChevronDown, Tag, X, Filter, Camera, Image as ImageIcon, Images, Clock, Heart, Upload, CheckCircle, Loader2 } from 'lucide-react';
import SharedImageView from './SharedImageView';
import { getShareImageUrl } from '../../utils/shareApi';

export default function SharedGalleryViewer({
  token, gallery, images, permissions, viewer,
  favorites = new Set(), favoriteCounts = {}, onToggleFavorite,
  uploads = [], onUpload, uploadState,
}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [gridColumns, setGridColumns] = useState(isMobile ? 2 : 3);
  const [showGridDropdown, setShowGridDropdown] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showMobileUploadModal, setShowMobileUploadModal] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Combine gallery images with approved uploads
  const allImages = useMemo(() => {
    const uploadImages = uploads.map(u => ({
      id: `upload-${u.id}`,
      name: u.display_name || u.original_filename || 'Uploaded pose',
      r2Key: u.image_url,
      tags: u.tags || [],
      isUpload: true,
      uploadedBy: u.share_viewers?.display_name || 'Unknown',
    }));
    return [...images, ...uploadImages];
  }, [images, uploads]);

  // Collect all unique tags from images
  const allTags = useMemo(() => {
    const tagSet = new Set();
    allImages.forEach(img => {
      if (img.tags) {
        img.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [allImages]);

  // Filter images by selected tags
  const displayedImages = useMemo(() => {
    if (selectedTags.length === 0) return allImages;
    return allImages.filter(img =>
      img.tags && selectedTags.every(tag => img.tags.includes(tag))
    );
  }, [allImages, selectedTags]);

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

  const handleFileSelect = (files) => {
    if (!onUpload || !files?.length) return;
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        onUpload(file);
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  if (selectedImage !== null) {
    return (
      <SharedImageView
        token={token}
        images={displayedImages}
        currentIndex={selectedImage}
        onClose={() => setSelectedImage(null)}
        onNavigate={setSelectedImage}
        allowFavorites={permissions?.allowFavorites}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
      />
    );
  }

  const uploadsAllowed = permissions?.allowUploads && onUpload;
  const isUploading = uploadState?.status === 'uploading';

  return (
    <div
      className="min-h-screen bg-gray-900 text-white"
      onDrop={uploadsAllowed ? handleDrop : undefined}
      onDragOver={uploadsAllowed ? handleDragOver : undefined}
      onDragLeave={uploadsAllowed ? handleDragLeave : undefined}
    >
      {/* Drag overlay */}
      {dragOver && uploadsAllowed && (
        <div className="fixed inset-0 z-50 bg-purple-600/20 border-4 border-dashed border-purple-400 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900/90 rounded-xl px-8 py-6 text-center">
            <Upload size={48} className="text-purple-400 mx-auto mb-3" />
            <p className="text-lg font-semibold">Drop images to upload</p>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      {uploadsAllowed && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => { handleFileSelect(e.target.files); setShowMobileUploadModal(false); }}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => { handleFileSelect(e.target.files); setShowMobileUploadModal(false); }}
            className="hidden"
          />
        </>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">{gallery.name}</h1>
            <p className="text-xs text-gray-400">
              {displayedImages.length} {displayedImages.length === 1 ? 'pose' : 'poses'}
              {selectedTags.length > 0 && ` (filtered from ${allImages.length})`}
              {viewer && <span className="ml-2">— Viewing as {viewer.display_name}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-3">
            {/* Upload Button */}
            {uploadsAllowed && (
              <button
                onClick={() => isMobile ? setShowMobileUploadModal(true) : fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-2 md:px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                <span className="hidden md:inline">
                  {isUploading ? 'Uploading...' : 'Upload'}
                </span>
              </button>
            )}

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
                      } ${cols === 4 ? 'hidden md:block' : ''}`}
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

      {/* Upload Status Toast */}
      {uploadState?.message && (
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 ${
            uploadState.status === 'success'
              ? 'bg-green-500/10 border border-green-500/20'
              : uploadState.status === 'error'
              ? 'bg-red-500/10 border border-red-500/20'
              : 'bg-blue-500/10 border border-blue-500/20'
          }`}>
            {uploadState.status === 'success' ? (
              <CheckCircle size={14} className="text-green-400 shrink-0" />
            ) : uploadState.status === 'uploading' ? (
              <Loader2 size={14} className="text-blue-400 shrink-0 animate-spin" />
            ) : null}
            <p className={`text-xs ${
              uploadState.status === 'success' ? 'text-green-300'
              : uploadState.status === 'error' ? 'text-red-300'
              : 'text-blue-300'
            }`}>
              {uploadState.message}
            </p>
          </div>
        </div>
      )}

      {/* Gallery Notes */}
      {gallery.notes && (
        <div className="max-w-6xl mx-auto px-4 py-3">
          <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg px-4 py-3">{gallery.notes}</p>
        </div>
      )}

      {/* Expiration Notice */}
      {permissions?.expiresAt && (
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-2.5">
            <Clock size={14} className="text-orange-400 shrink-0" />
            <p className="text-xs text-orange-300">
              This gallery expires on {new Date(permissions.expiresAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
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

                {/* Image name + upload badge overlay */}
                {(image.name || image.isUpload) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    {image.name && (
                      <p className="text-xs text-white truncate">{image.name}</p>
                    )}
                    {image.isUpload && (
                      <p className="text-[10px] text-green-300 truncate mt-0.5">
                        <Upload size={10} className="inline mr-0.5" />
                        {image.uploadedBy}
                      </p>
                    )}
                  </div>
                )}

                {/* Favorite button */}
                {permissions?.allowFavorites && onToggleFavorite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(image.id);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all cursor-pointer z-10"
                  >
                    <Heart
                      size={20}
                      className={favorites.has(image.id) ? 'fill-red-500 text-red-500' : 'text-white'}
                    />
                    {permissions.favoritesVisibleToOthers && favoriteCounts[image.id] > 0 && (
                      <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {favoriteCounts[image.id]}
                      </span>
                    )}
                  </button>
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

      {/* Mobile Upload Modal */}
      {showMobileUploadModal && uploadsAllowed && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end sm:items-center justify-center z-40">
          <div className="bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm sm:mx-4 animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Upload Images</h2>
              <button
                onClick={() => setShowMobileUploadModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Camera size={24} />
                </div>
                <div className="text-left">
                  <p className="font-medium">Take Photo</p>
                  <p className="text-sm text-gray-400">Use your camera</p>
                </div>
              </button>

              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <ImageIcon size={24} />
                </div>
                <div className="text-left">
                  <p className="font-medium">Photo Gallery</p>
                  <p className="text-sm text-gray-400">Choose from your photos</p>
                </div>
              </button>
            </div>

            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => setShowMobileUploadModal(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="flex justify-center py-6 opacity-30">
        <img src="/posevault-logo-white.svg" alt="PoseVault" className="h-5" />
      </footer>
    </div>
  );
}
