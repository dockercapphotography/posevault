import React, { useState, useEffect, useRef } from 'react';

// Components
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import CategoryGrid from './components/CategoryGrid';
import ImageGrid from './components/ImageGrid';
import SingleImageView from './components/SingleImageView';

// Modals
import NewCategoryModal from './components/Modals/NewCategoryModal';
import CategorySettingsModal from './components/Modals/CategorySettingsModal';
import DeleteConfirmModal from './components/Modals/DeleteConfirmModal';
import ImageEditModal from './components/Modals/ImageEditModal';
import FilterModal from './components/Modals/FilterModal';
import BulkEditModal from './components/Modals/BulkEditModal';
import UploadProgressModal from './components/Modals/UploadProgressModal';

// Hooks & Utils
import { useAuth } from './hooks/useAuth';
import { useCategories } from './hooks/useCategories';
import {
  getAllTags,
  getCategoryTags,
  getDisplayedCategories,
  getDisplayedImages
} from './utils/helpers';
import { convertToWebP, convertMultipleToWebP } from './utils/imageOptimizer';

export default function PhotographyPoseGuide() {
  const { isAuthenticated, currentUser, isLoading: authLoading, login, logout } = useAuth();
  const {
    categories,
    isLoading: categoriesLoading,
    isSaving,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryFavorite,
    addImages,
    updateImage,
    deleteImage,
    bulkUpdateImages,
    bulkDeleteImages,
    forceSave
  } = useCategories(currentUser);

  // View state
  const [viewMode, setViewMode] = useState('categories');
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // UI state
  const [showFavoriteCategoriesOnly, setShowFavoriteCategoriesOnly] = useState(false);
  const [categoryGridColumns, setCategoryGridColumns] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 2 : 3
  );
  const [showCategoryGridDropdown, setShowCategoryGridDropdown] = useState(false);
  const [gridColumns, setGridColumns] = useState(3);
  const [showGridDropdown, setShowGridDropdown] = useState(false);

  // Modals
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [showTagFilterModal, setShowTagFilterModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  // Upload progress
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadComplete, setUploadComplete] = useState(false);

  // Image filtering and sorting
  const [sortBy, setSortBy] = useState('dateAdded');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTagFilters, setSelectedTagFilters] = useState([]);
  const [tagFilterMode, setTagFilterMode] = useState('include');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk selection
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  // Refs
  const dropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowGridDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryGridDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
  const handleLogin = async (email, userData) => {
    await login(email, userData);
  };

  const handleLogout = async () => {
    await logout();
    setViewMode('categories');
    setCurrentCategory(null);
  };

  const handleBack = () => {
    if (viewMode === 'single') {
      setViewMode('grid');
    } else {
      setViewMode('categories');
      setCurrentCategory(null);
    }
  };

  const handleOpenCategory = (category) => {
    setCurrentCategory(category);
    setViewMode('grid');
    setCurrentImageIndex(0);
    setShowFavoritesOnly(false);
    setSelectedTagFilters([]);
    setTagFilterMode('include');
    setBulkSelectMode(false);
    setSelectedImages([]);
  };

  const handleOpenImage = (index) => {
    setCurrentImageIndex(index);
    setViewMode('single');
  };

  const handleCoverUpload = async (e, categoryId) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Convert to optimized WebP format (smaller size for thumbnails)
        const optimizedCover = await convertToWebP(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.85
        });
        updateCategory(categoryId, { cover: optimizedCover });
      } catch (error) {
        console.error('Error optimizing cover image:', error);
        // Fallback to original if conversion fails
        const reader = new FileReader();
        reader.onload = (event) => {
          updateCategory(categoryId, { cover: event.target.result });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleImagesUpload = async (e, categoryId) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Reset and show upload progress modal
    setUploadProgress({ current: 0, total: files.length });
    setUploadComplete(false);
    setShowUploadProgress(true);

    try {
      const images = [];

      // Process images one by one to show progress
      for (let i = 0; i < files.length; i++) {
        // Update progress
        setUploadProgress({ current: i + 1, total: files.length });

        try {
          // Convert to optimized WebP format
          const optimizedDataUrl = await convertToWebP(files[i], {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85
          });

          images.push({
            src: optimizedDataUrl,
            isFavorite: false,
            tags: [],
            notes: '',
            dateAdded: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Error optimizing image ${i + 1}:`, error);

          // Fallback to original if conversion fails
          const reader = await new Promise((resolve) => {
            const fileReader = new FileReader();
            fileReader.onload = (event) => resolve(event.target.result);
            fileReader.readAsDataURL(files[i]);
          });

          images.push({
            src: reader,
            isFavorite: false,
            tags: [],
            notes: '',
            dateAdded: new Date().toISOString()
          });
        }
      }

      // Add all processed images
      addImages(categoryId, images);

      // Show completion state
      setUploadComplete(true);

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        setShowUploadProgress(false);
        setUploadComplete(false);
      }, 1500);

    } catch (error) {
      console.error('Error uploading images:', error);
      setShowUploadProgress(false);

      // Show error message if quota exceeded
      if (error.message && error.message.includes('quota')) {
        alert('Storage quota exceeded! Please delete some images to free up space.');
      } else {
        alert('Upload failed. Please try again with fewer images.');
      }
    }

    // Reset file input
    e.target.value = '';
  };

  const handleToggleFavorite = (categoryId, imageIndex) => {
    const cat = categories.find(c => c.id === categoryId);
    const image = cat.images[imageIndex];
    updateImage(categoryId, imageIndex, { isFavorite: !image.isFavorite });
  };

  const handleSaveCategorySettings = (categoryId, name, notes) => {
    updateCategory(categoryId, { name, notes });
    setEditingCategory(null);
  };

  const handleSetSortBy = (value) => {
    if (value === 'favoritesOnly') {
      setSortBy('favorites');
      setShowFavoritesOnly(true);
    } else {
      setSortBy(value);
      setShowFavoritesOnly(false);
    }
  };

  const handleToggleTag = (tag) => {
    if (selectedTagFilters.includes(tag)) {
      setSelectedTagFilters(selectedTagFilters.filter(t => t !== tag));
    } else {
      setSelectedTagFilters([...selectedTagFilters, tag]);
    }
  };

  const handleImageClick = (index) => {
    if (bulkSelectMode) {
      if (selectedImages.includes(index)) {
        setSelectedImages(selectedImages.filter(i => i !== index));
      } else {
        setSelectedImages([...selectedImages, index]);
      }
    } else {
      handleOpenImage(index);
    }
  };

  const handleBulkEdit = (updates) => {
    if (!currentCategory) return;

    const bulkUpdates = {};
    
    if (updates.tags && updates.tags.length > 0) {
      bulkUpdates.tags = updates.tags;
    }
    
    if (updates.notes && updates.notes.trim()) {
      bulkUpdates.notes = updates.notes;
      bulkUpdates.notesMode = updates.notesMode;
    }
    
    if (updates.favoriteAction === 'favorite') {
      bulkUpdates.isFavorite = true;
    } else if (updates.favoriteAction === 'unfavorite') {
      bulkUpdates.isFavorite = false;
    }

    bulkUpdateImages(currentCategory.id, selectedImages, bulkUpdates);

    setBulkSelectMode(false);
    setSelectedImages([]);
  };

  const handleBulkDelete = () => {
    if (!currentCategory) return;

    // Delete all selected images at once
    bulkDeleteImages(currentCategory.id, selectedImages);

    setBulkSelectMode(false);
    setSelectedImages([]);
    setShowBulkEditModal(false);
  };

  // Get current category data
  const category = currentCategory ? categories.find(c => c.id === currentCategory.id) : null;

  // Get displayed categories
  const displayedCategories = getDisplayedCategories(categories, showFavoriteCategoriesOnly);

  // Get displayed images
  const displayedImages = category ? getDisplayedImages(category, {
    selectedTagFilters,
    tagFilterMode,
    showFavoritesOnly,
    sortBy,
    searchTerm
  }) : [];

  // Get all tags
  const allTags = getAllTags(categories);
  const categoryTags = category ? getCategoryTags(categories, category.id) : [];

  // Loading screen
  if (authLoading || (isAuthenticated && categoriesLoading)) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your pose library...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        viewMode={viewMode}
        categoryName={category?.name}
        categoryId={category?.id}
        onBack={handleBack}
        onAddCategory={() => setShowNewCategoryModal(true)}
        onUploadPoses={handleImagesUpload}
        onLogout={handleLogout}
        isUploading={showUploadProgress}
        isSaving={isSaving}
      />

      {viewMode === 'categories' && (
        <CategoryGrid
          categories={displayedCategories}
          showFavoriteCategoriesOnly={showFavoriteCategoriesOnly}
          categoryGridColumns={categoryGridColumns}
          showCategoryGridDropdown={showCategoryGridDropdown}
          categoryDropdownRef={categoryDropdownRef}
          onToggleShowFavorites={() => setShowFavoriteCategoriesOnly(!showFavoriteCategoriesOnly)}
          onToggleGridDropdown={() => setShowCategoryGridDropdown(!showCategoryGridDropdown)}
          onSetGridColumns={(cols) => {
            setCategoryGridColumns(cols);
            setShowCategoryGridDropdown(false);
          }}
          onOpenCategory={handleOpenCategory}
          onToggleFavorite={toggleCategoryFavorite}
          onUploadImages={handleImagesUpload}
          onEditSettings={(catId) => setEditingCategory(catId)}
          onUploadCover={handleCoverUpload}
          onDelete={(catId) => {
            setShowDeleteConfirm(catId);
          }}
        />
      )}

      {viewMode === 'grid' && category && (
        <ImageGrid
          category={category}
          images={displayedImages}
          originalImages={category.images}
          gridColumns={gridColumns}
          showGridDropdown={showGridDropdown}
          sortBy={sortBy}
          showFavoritesOnly={showFavoritesOnly}
          selectedTagFilters={categoryTags.length > 0 ? selectedTagFilters : null}
          searchTerm={searchTerm}
          bulkSelectMode={bulkSelectMode}
          selectedImages={selectedImages}
          dropdownRef={dropdownRef}
          onUploadImages={handleImagesUpload}
          onSetSortBy={handleSetSortBy}
          onShowTagFilter={() => setShowTagFilterModal(true)}
          onSearchChange={setSearchTerm}
          onToggleBulkSelect={() => {
            setBulkSelectMode(!bulkSelectMode);
            setSelectedImages([]);
          }}
          onShowBulkEdit={() => setShowBulkEditModal(true)}
          onToggleGridDropdown={() => setShowGridDropdown(!showGridDropdown)}
          onSetGridColumns={(cols) => {
            setGridColumns(cols);
            setShowGridDropdown(false);
          }}
          onImageClick={handleImageClick}
          onToggleFavorite={(index) => handleToggleFavorite(category.id, index)}
          onEditImage={(index) => setEditingImage({ categoryId: category.id, imageIndex: index })}
          onDeleteImage={(index) => {
            deleteImage(category.id, index);
            if (currentImageIndex >= category.images.length - 1) {
              setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
            }
          }}
          onStartBulkSelect={(index) => {
            setBulkSelectMode(true);
            setSelectedImages([index]);
          }}
        />
      )}

      {viewMode === 'single' && category && category.images.length > 0 && (
        <SingleImageView
          image={category.images[currentImageIndex]}
          currentIndex={currentImageIndex}
          totalImages={category.images.length}
          categoryName={category.name}
          category={category}
          onClose={() => setViewMode('grid')}
          onToggleFavorite={() => handleToggleFavorite(category.id, currentImageIndex)}
          onPrevious={() => setCurrentImageIndex(currentImageIndex - 1)}
          onNext={() => setCurrentImageIndex(currentImageIndex + 1)}
          onUpdateImage={updateImage}
        />
      )}

      {/* Modals */}
      {showNewCategoryModal && (
        <NewCategoryModal
          onClose={() => setShowNewCategoryModal(false)}
          onAdd={(name) => {
            addCategory(name);
            setShowNewCategoryModal(false);
          }}
        />
      )}

      {editingCategory && (() => {
        const cat = categories.find(c => c.id === editingCategory);
        return (
          <CategorySettingsModal
            category={cat}
            onClose={() => setEditingCategory(null)}
            onSave={handleSaveCategorySettings}
          />
        );
      })()}

      {showDeleteConfirm && (() => {
        const cat = categories.find(c => c.id === showDeleteConfirm);
        return (
          <DeleteConfirmModal
            category={cat}
            onConfirm={() => {
              deleteCategory(showDeleteConfirm);
              setShowDeleteConfirm(null);
              setEditingCategory(null);
            }}
            onClose={() => setShowDeleteConfirm(null)}
          />
        );
      })()}

      {editingImage && (() => {
        const cat = categories.find(c => c.id === editingImage.categoryId);
        const img = cat?.images[editingImage.imageIndex];
        return (
          <ImageEditModal
            image={img}
            imageIndex={editingImage.imageIndex}
            categoryId={editingImage.categoryId}
            allTags={allTags}
            onClose={() => setEditingImage(null)}
            onUpdateTags={(catId, imgIndex, tags) => updateImage(catId, imgIndex, { tags })}
            onUpdateNotes={(catId, imgIndex, notes) => updateImage(catId, imgIndex, { notes })}
            onUpdatePoseName={(catId, imgIndex, poseName) => updateImage(catId, imgIndex, { poseName })}
            onUpdate={(catId, imgIndex, updates) => updateImage(catId, imgIndex, updates)}
            onForceSave={forceSave}
          />
        );
      })()}

      {showTagFilterModal && category && (
        <FilterModal
          sortBy={sortBy}
          showFavoritesOnly={showFavoritesOnly}
          categoryTags={categoryTags}
          selectedTagFilters={selectedTagFilters}
          tagFilterMode={tagFilterMode}
          onSetSortBy={handleSetSortBy}
          onSetFilterMode={setTagFilterMode}
          onToggleTag={handleToggleTag}
          onClearFilters={() => {
            setSelectedTagFilters([]);
            setSortBy('dateAdded');
            setShowFavoritesOnly(false);
          }}
          onClose={() => setShowTagFilterModal(false)}
        />
      )}

      {showBulkEditModal && currentCategory && (
        <BulkEditModal
          selectedCount={selectedImages.length}
          selectedImages={selectedImages.map(index => currentCategory.images[index])}
          allTags={allTags}
          onClose={() => setShowBulkEditModal(false)}
          onApply={handleBulkEdit}
          onDelete={handleBulkDelete}
        />
      )}

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isVisible={showUploadProgress}
        currentImage={uploadProgress.current}
        totalImages={uploadProgress.total}
        isComplete={uploadComplete}
      />
    </div>
  );
}
