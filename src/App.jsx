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
import { uploadToR2, fetchFromR2, getR2Url, deleteFromR2 } from './utils/r2Upload';
import { hashPassword } from './utils/crypto';
import {
  createCategory as createCategoryInSupabase,
  updateCategory as updateCategoryInSupabase,
  deleteCategory as deleteCategoryInSupabase,
  createImage as createImageInSupabase,
  updateImage as updateImageInSupabase,
  deleteImage as deleteImageInSupabase,
  findImageByR2Key,
  syncImageTags,
  syncCategoryTags,
  updateUserStorage,
  fetchSupabaseCategories,
  fetchSupabaseImages,
  fetchFullCloudData,
  runCleanup
} from './utils/supabaseSync';

export default function PhotographyPoseGuide() {
  const { isAuthenticated, currentUser, session, isLoading: authLoading, isPasswordRecovery, login, register, logout, resetPassword, updatePassword } = useAuth();
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
    replaceAllCategories,
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

  // Cloud sync state
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncProgress, setCloudSyncProgress] = useState('');
  const [isInitialSync, setIsInitialSync] = useState(true); // true = show full-screen, false = background sync
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false); // true after first successful sync
  const cloudSyncAttemptedRef = useRef(false);
  const cleanupAttemptedRef = useRef(false);

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

  // ==========================================
  // CROSS-DEVICE SYNC: Pull from cloud on every load and merge
  // ==========================================
  const syncFromCloud = async ({ isInitial = true } = {}) => {
    if (!session?.user?.id || isCloudSyncing) return;

    const userId = session.user.id;
    const accessToken = session.access_token;
    const hasLocalData = categoriesRef.current.some(c => c.images && c.images.length > 0);

    setIsInitialSync(isInitial);
    setIsCloudSyncing(true);
    setCloudSyncProgress('Checking cloud for your data...');

    try {
      const cloudData = await fetchFullCloudData(userId);
      if (!cloudData.ok) {
        console.warn('Cloud sync failed:', cloudData.error);
        setIsCloudSyncing(false);
        setCloudSyncProgress('');
        return;
      }

      if (cloudData.categories.length === 0) {
        console.log('No cloud data found for this user');
        setHasSyncedOnce(true);
        setIsCloudSyncing(false);
        setCloudSyncProgress('');
        return;
      }

      const { categories: supabaseCategories, images: supabaseImages, imageTagsLookup } = cloudData;

      // Group images by category_uid
      const imagesByCategoryUid = {};
      for (const img of supabaseImages) {
        if (!imagesByCategoryUid[img.category_uid]) {
          imagesByCategoryUid[img.category_uid] = [];
        }
        imagesByCategoryUid[img.category_uid].push(img);
      }

      if (!hasLocalData) {
        // ---- FRESH SYNC: No local data, pull everything from cloud ----
        await fullCloudPull(supabaseCategories, imagesByCategoryUid, imageTagsLookup, accessToken);
      } else {
        // ---- INCREMENTAL MERGE: Merge cloud changes into existing local data ----
        await mergeCloudIntoLocal(supabaseCategories, supabaseImages, imagesByCategoryUid, imageTagsLookup, accessToken, userId);
      }

      // After pull/merge, retry any local images that failed to upload to R2/Supabase
      setCloudSyncProgress('Checking for unsynced local images...');
      const retriedCount = await retryFailedUploads();
      if (retriedCount > 0) {
        console.log(`Retried ${retriedCount} failed/pending uploads during sync`);
      }

      setHasSyncedOnce(true);
      setCloudSyncProgress('');
      setIsCloudSyncing(false);
    } catch (err) {
      console.error('Cloud sync error:', err);
      setCloudSyncProgress('');
      setIsCloudSyncing(false);
    }
  };

  // Auto-sync on load
  useEffect(() => {
    if (!session?.user?.id || categoriesLoading || isCloudSyncing) return;
    if (cloudSyncAttemptedRef.current) return;
    cloudSyncAttemptedRef.current = true;

    syncFromCloud();
  }, [session?.user?.id, categoriesLoading]);

  // Fetch multiple images from R2 in parallel batches
  const fetchImagesFromR2Parallel = async (images, accessToken, onProgress) => {
    const CONCURRENCY = 5;
    const results = new Array(images.length).fill(null);
    let completed = 0;

    let nextIndex = 0;
    const runWorker = async () => {
      while (nextIndex < images.length) {
        const i = nextIndex++;
        const img = images[i];
        let imageSrc = null;
        if (img.r2_key && accessToken) {
          const r2Result = await fetchFromR2(img.r2_key, accessToken);
          if (r2Result.ok) {
            imageSrc = r2Result.dataURL;
          } else {
            console.warn(`Failed to fetch image from R2: ${img.r2_key}`, r2Result.error);
            imageSrc = getR2Url(img.r2_key);
          }
        }
        results[i] = imageSrc;
        completed++;
        if (onProgress) onProgress(completed, images.length);
      }
    };
    const workers = Array.from({ length: Math.min(CONCURRENCY, images.length) }, () => runWorker());
    await Promise.all(workers);
    return results;
  };

  // Full cloud pull — used when local storage is empty (first sync / new device)
  const fullCloudPull = async (supabaseCategories, imagesByCategoryUid, imageTagsLookup, accessToken) => {
    setCloudSyncProgress(`Found ${supabaseCategories.length} categories, loading images...`);

    const localCategories = [];
    let totalImages = 0;
    let loadedImages = 0;

    for (const cat of supabaseCategories) {
      totalImages += (imagesByCategoryUid[cat.uid] || []).length;
    }

    for (let catIdx = 0; catIdx < supabaseCategories.length; catIdx++) {
      const cat = supabaseCategories[catIdx];
      const catImages = imagesByCategoryUid[cat.uid] || [];

      setCloudSyncProgress(
        `Loading "${cat.name}" (${catIdx + 1}/${supabaseCategories.length})...`
      );

      // Fetch all images for this category in parallel
      const imageSrcs = await fetchImagesFromR2Parallel(catImages, accessToken, (done, total) => {
        const currentLoaded = loadedImages + done;
        if (done % 3 === 0 || done === total) {
          setCloudSyncProgress(`Loading images... ${currentLoaded}/${totalImages}`);
        }
      });
      loadedImages += catImages.length;

      const localImages = catImages.map((img, i) => ({
        src: imageSrcs[i],
        poseName: img.name || '',
        notes: img.notes || '',
        isFavorite: img.favorite || false,
        tags: imageTagsLookup[img.uid] || [],
        dateAdded: img.created_at || new Date().toISOString(),
        r2Key: img.r2_key || null,
        r2Status: img.r2_key ? 'uploaded' : 'pending',
        supabaseUid: img.uid,
        size: img.image_size || 0,
      }));

      let coverSrc = null;
      if (cat.cover_image_uid) {
        const coverLocal = localImages.find(li => li.supabaseUid === cat.cover_image_uid);
        if (coverLocal) {
          coverSrc = coverLocal.src;
        }
      }

      localCategories.push({
        id: catIdx + 1,
        name: cat.name,
        cover: coverSrc,
        images: localImages,
        isFavorite: cat.favorite || false,
        notes: cat.notes || '',
        isPrivate: cat.private_gallery || false,
        privatePassword: cat.gallery_password || null,
        supabaseUid: cat.uid,
      });
    }

    setCloudSyncProgress('Saving to local storage...');
    replaceAllCategories(localCategories);
    console.log(`Cloud sync complete: ${localCategories.length} categories, ${loadedImages} images`);
  };

  // Incremental merge — used when local data exists (page refresh / returning to app)
  const mergeCloudIntoLocal = async (supabaseCategories, supabaseImages, imagesByCategoryUid, imageTagsLookup, accessToken, userId) => {
    const local = categoriesRef.current;

    // Build lookup of local categories by supabaseUid
    const localByUid = {};
    for (const cat of local) {
      if (cat.supabaseUid) {
        localByUid[cat.supabaseUid] = cat;
      }
    }

    // Build set of cloud category UIDs and image UIDs
    const cloudCatUids = new Set(supabaseCategories.map(c => c.uid));
    const cloudImageUids = new Set(supabaseImages.map(i => i.uid));

    let changed = false;
    let nextId = Math.max(...local.map(c => c.id), 0) + 1;
    const updatedCategories = [...local];

    // ---- 1. Add new categories from cloud ----
    for (const cloudCat of supabaseCategories) {
      if (localByUid[cloudCat.uid]) continue; // Already exists locally

      setCloudSyncProgress(`Syncing new category "${cloudCat.name}"...`);

      const catImages = imagesByCategoryUid[cloudCat.uid] || [];

      // Fetch images in parallel
      const imageSrcs = await fetchImagesFromR2Parallel(catImages, accessToken);

      const localImages = catImages.map((img, i) => ({
        src: imageSrcs[i],
        poseName: img.name || '',
        notes: img.notes || '',
        isFavorite: img.favorite || false,
        tags: imageTagsLookup[img.uid] || [],
        dateAdded: img.created_at || new Date().toISOString(),
        r2Key: img.r2_key || null,
        r2Status: img.r2_key ? 'uploaded' : 'pending',
        supabaseUid: img.uid,
        size: img.image_size || 0,
      }));

      let coverSrc = null;
      if (cloudCat.cover_image_uid) {
        const coverLocal = localImages.find(li => li.supabaseUid === cloudCat.cover_image_uid);
        if (coverLocal) coverSrc = coverLocal.src;
      }

      updatedCategories.push({
        id: nextId++,
        name: cloudCat.name,
        cover: coverSrc,
        images: localImages,
        isFavorite: cloudCat.favorite || false,
        notes: cloudCat.notes || '',
        isPrivate: cloudCat.private_gallery || false,
        privatePassword: cloudCat.gallery_password || null,
        supabaseUid: cloudCat.uid,
      });
      changed = true;
    }

    // ---- 2. For existing categories, merge new images & update metadata ----
    for (let i = 0; i < updatedCategories.length; i++) {
      const localCat = updatedCategories[i];
      if (!localCat.supabaseUid) continue;

      const cloudCat = supabaseCategories.find(c => c.uid === localCat.supabaseUid);
      if (!cloudCat) continue;

      // Update category metadata from cloud
      const catUpdates = {};
      if (cloudCat.name !== localCat.name) catUpdates.name = cloudCat.name;
      if (cloudCat.notes !== localCat.notes && cloudCat.notes != null) catUpdates.notes = cloudCat.notes;
      if ((cloudCat.favorite || false) !== localCat.isFavorite) catUpdates.isFavorite = cloudCat.favorite || false;
      if ((cloudCat.private_gallery || false) !== localCat.isPrivate) catUpdates.isPrivate = cloudCat.private_gallery || false;
      if ((cloudCat.gallery_password || null) !== localCat.privatePassword) catUpdates.privatePassword = cloudCat.gallery_password || null;

      if (Object.keys(catUpdates).length > 0) {
        updatedCategories[i] = { ...localCat, ...catUpdates };
        changed = true;
      }

      // Check for new images in this category from cloud
      const cloudImages = imagesByCategoryUid[localCat.supabaseUid] || [];
      const localImageUids = new Set(
        localCat.images.filter(img => img.supabaseUid).map(img => img.supabaseUid)
      );

      const newCloudImages = cloudImages.filter(ci => !localImageUids.has(ci.uid));
      if (newCloudImages.length > 0) {
        setCloudSyncProgress(`Syncing ${newCloudImages.length} new images to "${localCat.name}"...`);

        // Fetch new images in parallel
        const imageSrcs = await fetchImagesFromR2Parallel(newCloudImages, accessToken);

        const newLocalImages = newCloudImages.map((img, idx) => ({
          src: imageSrcs[idx],
          poseName: img.name || '',
          notes: img.notes || '',
          isFavorite: img.favorite || false,
          tags: imageTagsLookup[img.uid] || [],
          dateAdded: img.created_at || new Date().toISOString(),
          r2Key: img.r2_key || null,
          r2Status: img.r2_key ? 'uploaded' : 'pending',
          supabaseUid: img.uid,
          size: img.image_size || 0,
        }));

        updatedCategories[i] = {
          ...updatedCategories[i],
          images: [...updatedCategories[i].images, ...newLocalImages],
        };
        changed = true;
      }

      // Update metadata on existing images from cloud
      const currentImages = updatedCategories[i].images;
      let imagesChanged = false;
      const mergedImages = currentImages.map(localImg => {
        if (!localImg.supabaseUid) return localImg;
        const cloudImg = cloudImages.find(ci => ci.uid === localImg.supabaseUid);
        if (!cloudImg) return localImg;

        const imgUpdates = {};
        const cloudName = cloudImg.name || '';
        const cloudNotes = cloudImg.notes || '';
        const cloudFav = cloudImg.favorite || false;
        const cloudTags = imageTagsLookup[cloudImg.uid] || [];

        if (cloudName !== localImg.poseName) imgUpdates.poseName = cloudName;
        if (cloudNotes !== localImg.notes) imgUpdates.notes = cloudNotes;
        if (cloudFav !== localImg.isFavorite) imgUpdates.isFavorite = cloudFav;
        if (JSON.stringify(cloudTags.sort()) !== JSON.stringify((localImg.tags || []).sort())) {
          imgUpdates.tags = cloudTags;
        }

        if (Object.keys(imgUpdates).length > 0) {
          imagesChanged = true;
          return { ...localImg, ...imgUpdates };
        }
        return localImg;
      });

      if (imagesChanged) {
        updatedCategories[i] = { ...updatedCategories[i], images: mergedImages };
        changed = true;
      }
    }

    // ---- 3. Remove locally-synced categories that were deleted in cloud ----
    const beforeCount = updatedCategories.length;
    const filtered = updatedCategories.filter(cat => {
      // Keep categories that have no supabaseUid (local-only, not yet synced)
      if (!cat.supabaseUid) return true;
      // Keep if still exists in cloud
      return cloudCatUids.has(cat.supabaseUid);
    });
    if (filtered.length !== beforeCount) {
      changed = true;
    }

    // ---- 4. Remove locally-synced images that were deleted in cloud ----
    const finalCategories = filtered.map(cat => {
      if (!cat.supabaseUid) return cat;
      const originalLen = cat.images.length;
      const filteredImages = cat.images.filter(img => {
        if (!img.supabaseUid) return true;
        return cloudImageUids.has(img.supabaseUid);
      });
      if (filteredImages.length !== originalLen) {
        changed = true;
        return { ...cat, images: filteredImages };
      }
      return cat;
    });

    if (changed) {
      replaceAllCategories(finalCategories);
      console.log('Incremental cloud sync: local data updated');
    } else {
      console.log('Incremental cloud sync: already up to date');
    }
  };

  // Hydrate local categories AND images with Supabase UIDs on load
  useEffect(() => {
    if (!session?.user?.id || categoriesLoading || categories.length === 0) return;

    const userId = session.user.id;

    // Check if any categories or images need hydration
    const needsCategoryHydration = categories.some(c => !c.supabaseUid);
    const needsImageHydration = categories.some(c =>
      c.supabaseUid && c.images?.some(img => !img.supabaseUid && img.r2Key)
    );

    if (!needsCategoryHydration && !needsImageHydration) return;

    const hydrateAll = async () => {
      // Step 1: Hydrate categories
      if (needsCategoryHydration) {
        const result = await fetchSupabaseCategories(userId);
        if (result.ok) {
          const supabaseCategories = result.categories;
          const localCategories = categoriesRef.current;

          for (const local of localCategories) {
            if (local.supabaseUid) continue;
            const match = supabaseCategories.find(sc => sc.name === local.name);
            if (match) {
              updateCategory(local.id, { supabaseUid: match.uid });
              console.log(`Hydrated category supabaseUid for "${local.name}": ${match.uid}`);
            }
          }

          // Wait for category state to settle before hydrating images
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Step 2: Hydrate images - backfill supabaseUid by matching r2_key
      const latestCategories = categoriesRef.current;
      for (const cat of latestCategories) {
        if (!cat.supabaseUid) continue;

        const imagesNeedingHydration = cat.images?.filter(img => !img.supabaseUid && img.r2Key) || [];
        if (imagesNeedingHydration.length === 0) continue;

        console.log(`Hydrating ${imagesNeedingHydration.length} images for category "${cat.name}"`);

        const imgResult = await fetchSupabaseImages(cat.supabaseUid, userId);
        if (!imgResult.ok) continue;

        const supabaseImages = imgResult.images;
        for (let idx = 0; idx < cat.images.length; idx++) {
          const localImg = cat.images[idx];
          if (localImg.supabaseUid || !localImg.r2Key) continue;

          const match = supabaseImages.find(si => si.r2_key === localImg.r2Key);
          if (match) {
            updateImage(cat.id, idx, { supabaseUid: match.uid });
            console.log(`Hydrated image supabaseUid for r2Key="${localImg.r2Key}": ${match.uid}`);
          }
        }
      }
    };

    hydrateAll();
  }, [session?.user?.id, categoriesLoading, categories.length]);

  // ==========================================
  // BATCH CLEANUP: Purge soft-deleted records and R2 files
  // ==========================================
  useEffect(() => {
    if (!session?.user?.id || !session?.access_token || categoriesLoading) return;
    if (cleanupAttemptedRef.current) return;
    cleanupAttemptedRef.current = true;

    const doCleanup = async () => {
      console.log('Running batch cleanup...');
      const result = await runCleanup(session.user.id, session.access_token, deleteFromR2);
      if (result.ok) {
        const { deletedImages, deletedCategories, freedBytes, errors } = result;
        if (deletedImages > 0 || deletedCategories > 0) {
          console.log(
            `Cleanup finished: ${deletedImages} images, ${deletedCategories} categories purged, ` +
            `${(freedBytes / 1024 / 1024).toFixed(2)} MB freed`
          );
        } else {
          console.log('Cleanup: nothing to purge');
        }
        if (errors.length > 0) {
          console.warn('Cleanup encountered errors:', errors);
        }
      } else {
        console.error('Cleanup failed:', result.errors);
      }
    };

    // Run cleanup in background after a short delay to not compete with initial load
    const timer = setTimeout(doCleanup, 3000);
    return () => clearTimeout(timer);
  }, [session?.user?.id, session?.access_token, categoriesLoading]);

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
    window.scrollTo(0, 0);
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
    window.scrollTo(0, 0);
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
    window.scrollTo(0, 0);
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

        // Upload to R2 and link in Supabase in background
        if (session?.access_token) {
          uploadCoverAndLink(optimizedCover, categoryId, file.name);
        }
      } catch (error) {
        console.error('Error optimizing cover image:', error);
        // Fallback to original if conversion fails
        const reader = new FileReader();
        reader.onload = (event) => {
          updateCategory(categoryId, { cover: event.target.result });
          if (session?.access_token) {
            uploadCoverAndLink(event.target.result, categoryId, file.name);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Upload a cover image to R2, create an image record, and link it to the category
  const uploadCoverAndLink = async (dataURL, categoryId, originalFilename) => {
    const userId = session?.user?.id;
    if (!userId) return;

    const cat = categoriesRef.current.find(c => c.id === categoryId);
    if (!cat) return;

    const filename = (originalFilename || 'cover').replace(/\.[^/.]+$/, '') + '_cover.webp';

    try {
      // Upload to R2
      const r2Result = await uploadToR2(dataURL, filename, session.access_token);
      if (!r2Result.ok) {
        console.error('Cover R2 upload failed:', r2Result.error);
        return;
      }
      console.log(`Cover uploaded to R2: ${r2Result.key}`);

      // Store R2 key locally
      updateCategory(categoryId, { coverR2Key: r2Result.key });

      // Create image record in Supabase
      const categoryUid = categoriesRef.current.find(c => c.id === categoryId)?.supabaseUid;
      if (!categoryUid) {
        console.warn('No supabaseUid yet for category, cover_image_uid will be linked after hydration');
        return;
      }

      const imageResult = await createImageInSupabase(
        {
          r2Key: r2Result.key,
          size: r2Result.size,
          poseName: filename,
          notes: 'Cover image',
          isFavorite: false,
        },
        categoryUid,
        userId
      );

      if (imageResult.ok) {
        // Link cover_image_uid on the category
        updateCategoryInSupabase(categoryUid, { coverImageUid: imageResult.uid }, userId)
          .then(res => {
            if (res.ok) {
              console.log(`Cover linked: cover_image_uid = ${imageResult.uid}`);
            } else {
              console.warn('Failed to link cover_image_uid:', res.error);
            }
          });

        // Track storage
        updateUserStorage(userId, r2Result.size);
      } else {
        console.error('Cover Supabase image create failed:', imageResult.error);
      }
    } catch (err) {
      console.error('Cover upload error:', err);
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

      // Capture the current image count BEFORE adding (for correct R2 upload indexing)
      const existingCat = categoriesRef.current.find(c => c.id === categoryId);
      const startIndex = existingCat ? existingCat.images.length : 0;

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
        uploadImagesToR2InBackground(categoryId, images, filenames, startIndex);
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
  // Upload a single image to R2 with retry logic
  const uploadSingleToR2WithRetry = async (dataURL, filename, accessToken, maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await uploadToR2(dataURL, filename, accessToken);
      if (result.ok) return result;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`R2 upload attempt ${attempt + 1} failed for ${filename}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        return result; // Return the last failure
      }
    }
  };

  const uploadImagesToR2InBackground = async (categoryId, images, filenames, startIndex) => {
    const userId = session?.user?.id;
    const CONCURRENCY = 3;

    // Process a single image: upload to R2, create Supabase record
    const processImage = async (i) => {
      const imageIndex = startIndex + i;

      try {
        // Update status to uploading
        updateImage(categoryId, imageIndex, { r2Status: 'uploading' });

        // Use fresh access token from session ref to avoid stale tokens
        const currentToken = session?.access_token;
        const result = await uploadSingleToR2WithRetry(
          images[i].src,
          filenames[i],
          currentToken
        );

        if (result.ok) {
          // Update local with R2 key and file size
          updateImage(categoryId, imageIndex, {
            r2Key: result.key,
            r2Status: 'uploaded',
            size: result.size || 0
          });
          console.log(`R2 upload successful (${i + 1}/${images.length}): ${result.key}`);

          // Create image record in Supabase
          if (userId) {
            // Read category UID fresh from ref (may have been hydrated since upload started)
            const categorySupabaseUid = categoriesRef.current.find(c => c.id === categoryId)?.supabaseUid;
            if (!categorySupabaseUid) {
              console.warn(`No supabaseUid for category ${categoryId}, skipping Supabase image create for image ${i + 1}`);
              return;
            }

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
          console.error(`R2 upload failed for image ${i + 1} after retries:`, result.error);
        }
      } catch (err) {
        updateImage(categoryId, imageIndex, { r2Status: 'failed' });
        console.error(`R2 upload error for image ${i + 1}:`, err);
      }
    };

    // Upload with concurrency pool (max CONCURRENCY simultaneous uploads)
    let nextIndex = 0;
    const runWorker = async () => {
      while (nextIndex < images.length) {
        const i = nextIndex++;
        await processImage(i);
      }
    };
    const workers = Array.from({ length: Math.min(CONCURRENCY, images.length) }, () => runWorker());
    await Promise.all(workers);

    // Force save to IndexedDB after all uploads complete to prevent data loss
    await forceSave();
    console.log(`Background R2 upload complete: ${images.length} images processed`);
  };

  // Retry any images stuck in 'failed' or 'pending' r2Status that have local src data
  const retryFailedUploads = async () => {
    const userId = session?.user?.id;
    const accessToken = session?.access_token;
    if (!userId || !accessToken) return 0;

    const allCategories = categoriesRef.current;
    let retried = 0;

    for (const cat of allCategories) {
      if (!cat.images || cat.images.length === 0) continue;

      for (let imgIdx = 0; imgIdx < cat.images.length; imgIdx++) {
        const img = cat.images[imgIdx];

        // Skip images that are already uploaded or have no local data to upload
        if (!img.src || img.r2Status === 'uploaded' || img.r2Status === 'uploading') continue;
        // Only retry images that failed or are still pending (have src but no r2Key)
        if (img.r2Key) continue;

        retried++;
        console.log(`Retrying upload for image ${imgIdx} in category "${cat.name}" (status: ${img.r2Status})`);
        updateImage(cat.id, imgIdx, { r2Status: 'uploading' });

        try {
          const filename = img.poseName || `image-${imgIdx}`;
          const result = await uploadSingleToR2WithRetry(img.src, filename, accessToken);

          if (result.ok) {
            updateImage(cat.id, imgIdx, {
              r2Key: result.key,
              r2Status: 'uploaded',
              size: result.size || 0
            });
            console.log(`Retry upload successful: ${result.key}`);

            // Create Supabase record if category has a UID
            const categorySupabaseUid = categoriesRef.current.find(c => c.id === cat.id)?.supabaseUid;
            if (categorySupabaseUid) {
              const supabaseResult = await createImageInSupabase(
                {
                  r2Key: result.key,
                  size: result.size,
                  poseName: img.poseName || filename,
                  notes: img.notes || '',
                  isFavorite: img.isFavorite || false,
                },
                categorySupabaseUid,
                userId
              );

              if (supabaseResult.ok) {
                updateImage(cat.id, imgIdx, { supabaseUid: supabaseResult.uid });
                console.log(`Retry Supabase record created: ${supabaseResult.uid}`);
                updateUserStorage(userId, result.size);
              } else {
                console.error('Retry Supabase create failed:', supabaseResult.error);
              }
            }
          } else {
            updateImage(cat.id, imgIdx, { r2Status: 'failed' });
            console.error(`Retry upload failed for image ${imgIdx} in "${cat.name}"`);
          }
        } catch (err) {
          updateImage(cat.id, imgIdx, { r2Status: 'failed' });
          console.error(`Retry upload error for image ${imgIdx} in "${cat.name}":`, err);
        }
      }
    }

    if (retried > 0) {
      await forceSave();
      console.log(`Retry cycle complete: ${retried} images attempted`);
    }
    return retried;
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
      if (!userId) return;

      let imageUid = image.supabaseUid;

      // Fallback: if no supabaseUid but we have an r2Key, look it up
      if (!imageUid && image.r2Key) {
        console.log('Image missing supabaseUid, looking up by r2Key:', image.r2Key);
        const lookup = await findImageByR2Key(image.r2Key, userId);
        if (lookup.ok) {
          imageUid = lookup.uid;
          // Cache the UID locally so we don't have to look it up again
          updateImage(categoryId, imageIndex, { supabaseUid: imageUid });
          console.log('Found and cached supabaseUid:', imageUid);
        } else {
          console.warn('Could not find image in Supabase by r2Key:', image.r2Key);
          return;
        }
      }

      if (!imageUid) {
        console.warn('No supabaseUid and no r2Key for image, skipping Supabase sync');
        return;
      }

      // Sync metadata updates
      updateImageInSupabase(imageUid, updates, userId)
        .then(result => {
          if (!result.ok) {
            console.warn('Supabase image sync failed:', result.error);
          }
        })
        .catch(err => console.error('Supabase sync error:', err));

      // Sync tags if they were updated
      if (updates.tags) {
        console.log('Syncing tags to Supabase:', updates.tags, 'imageUid:', imageUid);
        syncImageTags(imageUid, updates.tags, userId)
          .then(result => {
            if (!result.ok) {
              console.warn('Supabase tags sync failed:', result.error);
            } else {
              console.log('Tags synced successfully to Supabase');
            }
          })
          .catch(err => console.error('Supabase tags sync error:', err));
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
        notes: privateSettings?.notes || '',
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

              // Upload cover image to R2 and link it if one was provided
              if (addedCat.cover && session?.access_token) {
                uploadCoverAndLink(addedCat.cover, addedCat.id, name);
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

  // Delete category locally AND soft-delete in Supabase (including child images)
  const deleteCategoryWithSync = async (categoryId) => {
    const cat = categoriesRef.current.find(c => c.id === categoryId);
    const userId = session?.user?.id;

    if (cat && userId) {
      // Soft-delete all images in this category
      for (const image of (cat.images || [])) {
        let imageUid = image.supabaseUid;
        if (!imageUid && image.r2Key) {
          const lookup = await findImageByR2Key(image.r2Key, userId);
          if (lookup.ok) imageUid = lookup.uid;
        }
        if (imageUid) {
          deleteImageInSupabase(imageUid, userId)
            .catch(err => console.error('Supabase image delete (category cascade) error:', err));
        }
      }

      // Soft-delete the category itself
      if (cat.supabaseUid) {
        deleteCategoryInSupabase(cat.supabaseUid, userId)
          .catch(err => console.error('Supabase category delete error:', err));
      }
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

  const handleBulkEdit = async (updates) => {
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

    // Update locally first
    bulkUpdateImages(currentCategory.id, selectedImages, bulkUpdates);

    // Sync to Supabase in background
    const userId = session?.user?.id;
    if (userId) {
      const cat = categoriesRef.current.find(c => c.id === currentCategory.id);
      if (cat) {
        for (const imageIndex of selectedImages) {
          const image = cat.images[imageIndex];
          if (!image) continue;

          // Resolve supabaseUid (with fallback lookup by r2Key)
          let imageUid = image.supabaseUid;
          if (!imageUid && image.r2Key) {
            const lookup = await findImageByR2Key(image.r2Key, userId);
            if (lookup.ok) {
              imageUid = lookup.uid;
              updateImage(currentCategory.id, imageIndex, { supabaseUid: imageUid });
            }
          }
          if (!imageUid) continue;

          // Sync metadata updates (notes, favorites)
          const metaUpdates = {};
          if (bulkUpdates.notes !== undefined) metaUpdates.notes = bulkUpdates.notes;
          if (bulkUpdates.isFavorite !== undefined) metaUpdates.isFavorite = bulkUpdates.isFavorite;

          if (Object.keys(metaUpdates).length > 0) {
            updateImageInSupabase(imageUid, metaUpdates, userId)
              .catch(err => console.error('Bulk edit Supabase sync error:', err));
          }

          // Sync tags: merge new tags with existing image tags, then sync
          if (bulkUpdates.tags && bulkUpdates.tags.length > 0) {
            const existingTags = image.tags || [];
            const mergedTags = [...new Set([...existingTags, ...bulkUpdates.tags])];
            syncImageTags(imageUid, mergedTags, userId)
              .catch(err => console.error('Bulk edit tag sync error:', err));
          }
        }
      }
    }

    setBulkSelectMode(false);
    setSelectedImages([]);
  };

  const handleBulkDelete = async () => {
    if (!currentCategory) return;

    const userId = session?.user?.id;

    // Soft-delete each selected image in Supabase before removing locally
    if (userId) {
      const cat = categoriesRef.current.find(c => c.id === currentCategory.id);
      if (cat) {
        for (const imageIndex of selectedImages) {
          const image = cat.images[imageIndex];
          if (!image) continue;

          let imageUid = image.supabaseUid;
          if (!imageUid && image.r2Key) {
            const lookup = await findImageByR2Key(image.r2Key, userId);
            if (lookup.ok) imageUid = lookup.uid;
          }
          if (imageUid) {
            deleteImageInSupabase(imageUid, userId)
              .catch(err => console.error('Bulk delete Supabase sync error:', err));
          }
        }
      }
    }

    // Delete all selected images locally
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

  // Cloud sync loading screen (only blocks UI on initial sync, not manual re-sync)
  if (isCloudSyncing && isInitialSync) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold mb-2">Syncing from cloud...</p>
          <p className="text-gray-400 text-sm">{cloudSyncProgress}</p>
          <p className="text-gray-500 text-xs mt-4">Your data is being downloaded from the cloud. This may take a moment for large libraries.</p>
        </div>
      </div>
    );
  }

  // Login screen (also shown during password recovery flow)
  if (!isAuthenticated || isPasswordRecovery) {
    return (
      <LoginScreen
        onLogin={login}
        onRegister={register}
        onResetPassword={resetPassword}
        onUpdatePassword={updatePassword}
        isPasswordRecovery={isPasswordRecovery}
      />
    );
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
        onSync={() => syncFromCloud({ isInitial: false })}
        onLogout={handleLogout}
        isUploading={showUploadProgress}
        isSaving={isSaving}
        isSyncing={isCloudSyncing}
        isSynced={hasSyncedOnce && !isCloudSyncing}
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
