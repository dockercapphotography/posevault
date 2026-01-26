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
import PrivateGalleryWarning from './components/Modals/PrivateGalleryWarning';
import PDFOptionsModal from './components/Modals/PDFOptionsModal';

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
import { uploadToR2 } from './utils/r2Upload';
import { hashPassword } from './utils/crypto';
import {
  createCategory as createCategoryInSupabase,
  updateCategory as updateCategoryInSupabase,
  deleteCategory as deleteCategoryInSupabase,
  createImage as createImageInSupabase,
  updateImage as updateImageInSupabase,
  deleteImage as deleteImageInSupabase,
  syncImageTags,
  syncCategoryTags,
  updateUserStorage,
  fetchSupabaseCategories
} from './utils/supabaseSync';

export default function PhotographyPoseGuide() {
  const { isAuthenticated, currentUser, session, isLoading: authLoading, login, register, logout } = useAuth();
  const {
    categories,
    categoriesRef,
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
  const [pendingPrivateCategory, setPendingPrivateCategory] = useState(null);
  const [pdfCategory, setPdfCategory] = useState(null);

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

  // Hydrate local categories with Supabase UIDs on load
  useEffect(() => {
    if (!session?.user?.id || categoriesLoading || categories.length === 0) return;

    // Check if any categories are missing supabaseUid
    const needsHydration = categories.some(c => !c.supabaseUid);
    if (!needsHydration) return;

    fetchSupabaseCategories(session.user.id).then(result => {
      if (!result.ok) return;

      const supabaseCategories = result.categories;
      // Use ref to get the latest local categories
      const localCategories = categoriesRef.current;

      for (const local of localCategories) {
        if (local.supabaseUid) continue; // Already has UID

        // Match by name
        const match = supabaseCategories.find(sc => sc.name === local.name);
        if (match) {
          updateCategory(local.id, { supabaseUid: match.uid });
          console.log(`Hydrated supabaseUid for "${local.name}": ${match.uid}`);
        }
      }
    });
  }, [session?.user?.id, categoriesLoading, categories.length]);

  // Handlers

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
    // Check if category is private
    if (category.isPrivate) {
      setPendingPrivateCategory(category);
      return;
    }
    
    // Open normally if not private
    setCurrentCategory(category);
    setViewMode('grid');
    setCurrentImageIndex(0);
    setShowFavoritesOnly(false);
    setSelectedTagFilters([]);
    setTagFilterMode('include');
    setBulkSelectMode(false);
    setSelectedImages([]);
  };

  const handleProceedToPrivateGallery = () => {
    const category = pendingPrivateCategory;
    setPendingPrivateCategory(null);
    
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
      const filenames = [];

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
            dateAdded: new Date().toISOString(),
            r2Key: null, // Will be updated after R2 upload
            r2Status: 'pending' // pending, uploading, uploaded, failed
          });
          filenames.push(files[i].name.replace(/\.[^/.]+$/, '.webp'));
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
            dateAdded: new Date().toISOString(),
            r2Key: null,
            r2Status: 'pending'
          });
          filenames.push(files[i].name);
        }
      }

      // Add all processed images to local storage first (fast)
      addImages(categoryId, images);

      // Show completion state for local storage
      setUploadComplete(true);

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        setShowUploadProgress(false);
        setUploadComplete(false);
      }, 1500);

      // Upload to R2 in background (don't block UI)
      if (session?.access_token) {
        uploadImagesToR2InBackground(categoryId, images, filenames);
      } else {
        console.warn('No session - skipping R2 upload');
      }

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

  // Background R2 upload function
  const uploadImagesToR2InBackground = async (categoryId, images, filenames) => {
    const cat = categoriesRef.current.find(c => c.id === categoryId);
    if (!cat) return;

    // Find the starting index of the newly added images
    const startIndex = cat.images.length - images.length;
    const userId = session?.user?.id;
    const categorySupabaseUid = cat.supabaseUid; // Get category's Supabase UID

    for (let i = 0; i < images.length; i++) {
      const imageIndex = startIndex + i;

      try {
        // Update status to uploading
        updateImage(categoryId, imageIndex, { r2Status: 'uploading' });

        const result = await uploadToR2(
          images[i].src,
          filenames[i],
          session.access_token
        );

        if (result.ok) {
          // Update local with R2 key
          updateImage(categoryId, imageIndex, {
            r2Key: result.key,
            r2Status: 'uploaded'
          });
          console.log(`R2 upload successful: ${result.key}`);

          // Create image record in Supabase
          if (userId) {
            const supabaseResult = await createImageInSupabase(
              {
                r2Key: result.key,
                size: result.size,
                poseName: images[i].poseName || filenames[i],
                notes: images[i].notes || '',
                isFavorite: images[i].isFavorite || false,
              },
              categorySupabaseUid,
              userId
            );

            if (supabaseResult.ok) {
              // Store the Supabase UID locally
              updateImage(categoryId, imageIndex, {
                supabaseUid: supabaseResult.uid
              });
              console.log(`Supabase image created: ${supabaseResult.uid}`);

              // Update user storage tracking
              updateUserStorage(userId, result.size);
            } else {
              console.error('Supabase image create failed:', supabaseResult.error);
            }
          }
        } else {
          updateImage(categoryId, imageIndex, { r2Status: 'failed' });
          console.error(`R2 upload failed for image ${i + 1}:`, result.error);
        }
      } catch (err) {
        updateImage(categoryId, imageIndex, { r2Status: 'failed' });
        console.error(`R2 upload error for image ${i + 1}:`, err);
      }
    }
  };

  // Wrapper that updates locally AND syncs to Supabase
  const updateImageWithSync = async (categoryId, imageIndex, updates) => {
    // First, update locally (fast)
    updateImage(categoryId, imageIndex, updates);

    // Then sync to Supabase in background (use ref for latest state)
    const cat = categoriesRef.current.find(c => c.id === categoryId);
    if (cat && cat.images[imageIndex]) {
      const image = cat.images[imageIndex];
      const userId = session?.user?.id;

      // Only sync if the image has a Supabase UID
      if (image.supabaseUid && userId) {
        // Sync metadata updates
        updateImageInSupabase(image.supabaseUid, updates, userId)
          .then(result => {
            if (!result.ok) {
              console.warn('Supabase image sync failed:', result.error);
            }
          })
          .catch(err => console.error('Supabase sync error:', err));

        // Sync tags if they were updated
        if (updates.tags) {
          syncImageTags(image.supabaseUid, updates.tags, userId)
            .then(result => {
              if (!result.ok) {
                console.warn('Supabase tags sync failed:', result.error);
              }
            })
            .catch(err => console.error('Supabase tags sync error:', err));
        }
      }
    }
  };

  // Wrapper for deletion that also syncs to Supabase
  const deleteImageWithSync = (categoryId, imageIndex) => {
    const cat = categoriesRef.current.find(c => c.id === categoryId);
    if (cat && cat.images[imageIndex]) {
      const image = cat.images[imageIndex];
      const userId = session?.user?.id;

      // Sync deletion to Supabase if image has a Supabase UID
      if (image.supabaseUid && userId) {
        deleteImageInSupabase(image.supabaseUid, userId)
          .catch(err => console.error('Supabase delete sync error:', err));
      }
    }

    // Delete locally
    deleteImage(categoryId, imageIndex);
  };

  const handleToggleFavorite = (categoryId, imageIndex) => {
    const cat = categoriesRef.current.find(c => c.id === categoryId);
    const image = cat.images[imageIndex];
    updateImageWithSync(categoryId, imageIndex, { isFavorite: !image.isFavorite });
  };

  // ==========================================
  // CATEGORY SYNC WRAPPERS
  // ==========================================

  // Add category locally AND create in Supabase
  const addCategoryWithSync = async (name, privateSettings = {}) => {
    const userId = session?.user?.id;
    const plainPassword = privateSettings?.privatePassword || null;

    // Hash the password before storing locally
    const hashedPassword = plainPassword ? await hashPassword(plainPassword) : null;
    const localSettings = {
      ...privateSettings,
      privatePassword: hashedPassword,
    };

    // Create locally with hashed password
    addCategory(name, localSettings);

    // Then create in Supabase
    if (userId) {
      const categoryData = {
        name,
        notes: '',
        isFavorite: false,
        isPrivate: privateSettings?.isPrivate || false,
        galleryPassword: hashedPassword,
      };

      createCategoryInSupabase(categoryData, userId)
        .then(result => {
          if (result.ok) {
            // Use categoriesRef to get the latest state (avoids stale closure)
            const addedCat = categoriesRef.current.find(c => c.name === name && !c.supabaseUid);
            if (addedCat) {
              updateCategory(addedCat.id, { supabaseUid: result.uid });

              // Push current local state to Supabase to catch any edits
              // made while the create was in flight (e.g. user added notes)
              const localUpdates = {};
              if (addedCat.notes) localUpdates.notes = addedCat.notes;
              if (addedCat.isFavorite) localUpdates.isFavorite = addedCat.isFavorite;
              if (addedCat.name !== name) localUpdates.name = addedCat.name;

              if (Object.keys(localUpdates).length > 0) {
                updateCategoryInSupabase(result.uid, localUpdates, userId)
                  .then(syncResult => {
                    if (!syncResult.ok) {
                      console.warn('Post-create sync failed:', syncResult.error);
                    }
                  });
              }
            }
            console.log(`Category created in Supabase: ${result.uid}`);
          } else {
            console.error('Supabase category create failed:', result.error);
          }
        })
        .catch(err => console.error('Supabase category create error:', err));
    }
  };

  // Update category locally AND sync to Supabase
  const updateCategoryWithSync = async (categoryId, updates) => {
    // Hash password if it's being updated
    if (updates.privatePassword) {
      updates.privatePassword = await hashPassword(updates.privatePassword);
    }

    // Update locally first
    updateCategory(categoryId, updates);

    // Sync to Supabase (use ref for latest state)
    const cat = categoriesRef.current.find(c => c.id === categoryId);
    const userId = session?.user?.id;

    if (cat?.supabaseUid && userId) {
      // Map local field names to Supabase field names for password
      const supabaseUpdates = { ...updates };
      if (updates.privatePassword !== undefined) {
        supabaseUpdates.galleryPassword = updates.privatePassword;
      }

      updateCategoryInSupabase(cat.supabaseUid, supabaseUpdates, userId)
        .then(result => {
          if (!result.ok) {
            console.warn('Supabase category sync failed:', result.error);
          }
        })
        .catch(err => console.error('Supabase category sync error:', err));

      // Sync category tags if updated
      if (updates.tags) {
        syncCategoryTags(cat.supabaseUid, updates.tags, userId)
          .catch(err => console.error('Supabase category tags sync error:', err));
      }
    }
  };

  // Delete category locally AND soft-delete in Supabase
  const deleteCategoryWithSync = (categoryId) => {
    const cat = categoriesRef.current.find(c => c.id === categoryId);
    const userId = session?.user?.id;

    // Sync deletion to Supabase
    if (cat?.supabaseUid && userId) {
      deleteCategoryInSupabase(cat.supabaseUid, userId)
        .catch(err => console.error('Supabase category delete error:', err));
    }

    // Delete locally
    deleteCategory(categoryId);
  };

  // Toggle category favorite with sync
  const toggleCategoryFavoriteWithSync = (categoryId) => {
    const cat = categoriesRef.current.find(c => c.id === categoryId);
    if (!cat) return;

    // Toggle locally
    toggleCategoryFavorite(categoryId);

    // Sync to Supabase
    const userId = session?.user?.id;
    if (cat.supabaseUid && userId) {
      updateCategoryInSupabase(cat.supabaseUid, { isFavorite: !cat.isFavorite }, userId)
        .catch(err => console.error('Supabase category favorite sync error:', err));
    }
  };

  const handleSaveCategorySettings = (categoryId, updates) => {
    updateCategoryWithSync(categoryId, updates);
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
    return <LoginScreen onLogin={login} onRegister={register} />;
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
          onToggleFavorite={toggleCategoryFavoriteWithSync}
          onUploadImages={handleImagesUpload}
          onEditSettings={(catId) => setEditingCategory(catId)}
          onUploadCover={handleCoverUpload}
          onDelete={(catId) => {
            setShowDeleteConfirm(catId);
          }}
          onGeneratePDF={(category) => setPdfCategory(category)}
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
            deleteImageWithSync(category.id, index);
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
          onUpdateImage={updateImageWithSync}
        />
      )}

      {/* Modals */}
      {showNewCategoryModal && (
        <NewCategoryModal
          onClose={() => setShowNewCategoryModal(false)}
          onAdd={(name, privateSettings) => {
            addCategoryWithSync(name, privateSettings);
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
              deleteCategoryWithSync(showDeleteConfirm);
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
            onUpdateTags={(catId, imgIndex, tags) => updateImageWithSync(catId, imgIndex, { tags })}
            onUpdateNotes={(catId, imgIndex, notes) => updateImageWithSync(catId, imgIndex, { notes })}
            onUpdatePoseName={(catId, imgIndex, poseName) => updateImageWithSync(catId, imgIndex, { poseName })}
            onUpdate={(catId, imgIndex, updates) => updateImageWithSync(catId, imgIndex, updates)}
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

      {/* Private Gallery Warning Modal */}
      {pendingPrivateCategory && (
        <PrivateGalleryWarning
          category={pendingPrivateCategory}
          onProceed={handleProceedToPrivateGallery}
          onCancel={() => setPendingPrivateCategory(null)}
        />
      )}

      {/* PDF Options Modal */}
      {pdfCategory && (
        <PDFOptionsModal
          category={pdfCategory}
          onClose={() => setPdfCategory(null)}
        />
      )}
    </div>
  );
}
