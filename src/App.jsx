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
import GalleryFilterModal from './components/Modals/GalleryFilterModal';
import GalleryBulkEditModal from './components/Modals/GalleryBulkEditModal';
import UploadProgressModal from './components/Modals/UploadProgressModal';
import PrivateGalleryWarning from './components/Modals/PrivateGalleryWarning';
import PDFOptionsModal from './components/Modals/PDFOptionsModal';
import MobileUploadModal from './components/Modals/MobileUploadModal';
import UserSettingsModal from './components/UserSettingsModal';

// Hooks & Utils
import { useAuth } from './hooks/useAuth';
import { useCategories } from './hooks/useCategories';
import { createSampleGallery } from './utils/sampleGallery';
import {
  getAllTags,
  getCategoryTags,
  getAllGalleryTags,
  getDisplayedCategories,
  getDisplayedImages
} from './utils/helpers';
import { getUserSetting, setUserSetting } from './utils/userSettingsSync';
import { getUserStorageInfo } from './utils/userStorage';
import { convertToWebP, convertMultipleToWebP } from './utils/imageOptimizer';
import { uploadToR2, fetchFromR2, getR2Url, deleteFromR2 } from './utils/r2Upload';
import { hashPassword } from './utils/crypto';
import Joyride, { ACTIONS, EVENTS, STATUS } from '@list-labs/react-joyride';
import { useTutorial } from './hooks/useTutorial';
import { useImageTutorial } from './hooks/useImageTutorial';
import { tutorialSteps, tutorialStyles } from './utils/tutorialSteps.jsx';
import { imageTutorialSteps } from './utils/imageTutorialSteps.jsx';
import StorageLimitModal from './components/StorageLimitModal';
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
    bulkUpdateCategories,
    bulkDeleteCategories,
    replaceAllCategories,
    forceSave
  } = useCategories(currentUser);

  // View state
  const [viewMode, setViewMode] = useState('categories');
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // UI state
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
  const [showMobileUploadModal, setShowMobileUploadModal] = useState(null); // stores categoryId when open
  const [pendingPrivateCategory, setPendingPrivateCategory] = useState(null);
  const [pdfCategory, setPdfCategory] = useState(null);
  const [showUserSettings, setShowUserSettings] = useState(false);

  // Tutorial state
  const {
    runTutorial,
    stepIndex,
    isLoading: tutorialLoading,
    startTutorial,
    stopTutorial,
    completeTutorial,
    setStepIndex,
  } = useTutorial(session?.user?.id);

  // Image gallery tutorial state
  const {
    runTutorial: runImageTutorial,
    stepIndex: imageStepIndex,
    isLoading: imageTutorialLoading,
    startTutorial: startImageTutorial,
    resetTutorial: resetImageTutorial,
    stopTutorial: stopImageTutorial,
    completeTutorial: completeImageTutorial,
    setStepIndex: setImageStepIndex,
  } = useImageTutorial(session?.user?.id, viewMode === 'grid');

  // Upload progress
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [rejectedFiles, setRejectedFiles] = useState(null);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadComplete, setUploadComplete] = useState(false);
  
  // Storage limit modal
  const [showStorageLimitModal, setShowStorageLimitModal] = useState(false);
  const [storageLimitInfo, setStorageLimitInfo] = useState(null);

  // Image filtering and sorting
  const [sortBy, setSortBy] = useState('dateAdded');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTagFilters, setSelectedTagFilters] = useState([]);
  const [tagFilterMode, setTagFilterMode] = useState('include');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk selection (for images)
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  // Gallery filtering and sorting
  const [gallerySearchTerm, setGallerySearchTerm] = useState('');
  const [selectedGalleryTagFilters, setSelectedGalleryTagFilters] = useState([]);
  const [galleryTagFilterMode, setGalleryTagFilterMode] = useState('include');
  const [gallerySortBy, setGallerySortBy] = useState('nameAZ');
  const [showGalleryFilterModal, setShowGalleryFilterModal] = useState(false);

  // Gallery bulk selection
  const [galleryBulkSelectMode, setGalleryBulkSelectMode] = useState(false);
  const [selectedGalleries, setSelectedGalleries] = useState([]);
  const [showGalleryBulkEditModal, setShowGalleryBulkEditModal] = useState(false);

  // Cloud sync state
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncProgress, setCloudSyncProgress] = useState('');
  const [isInitialSync, setIsInitialSync] = useState(true); // true = show full-screen, false = background sync
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false); // true after first successful sync
  const cloudSyncAttemptedRef = useRef(false);

  // First-time setup state (gates tutorial until sample gallery is ready)
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [firstTimeSetupComplete, setFirstTimeSetupComplete] = useState(false);

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

  // Handle Android/browser back button via history API
  useEffect(() => {
    const onPopState = (e) => {
      const state = e.state;
      if (state?.view === 'grid') {
        setViewMode('grid');
        window.scrollTo(0, 0);
      } else if (state?.view === 'categories' || !state) {
        setViewMode('categories');
        setCurrentCategory(null);
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ==========================================
  // CROSS-DEVICE SYNC: Pull from cloud on every load and merge
  // ==========================================
  const syncFromCloud = async ({ isInitial = true, silent = false } = {}) => {
    if (!session?.user?.id || isCloudSyncing) return;

    const userId = session.user.id;
    const accessToken = session.access_token;
    const hasLocalData = categoriesRef.current.some(c => c.images && c.images.length > 0);

    // Always set syncing state for header icon, but only show full-screen UI if not silent
    setIsCloudSyncing(true);
    
    if (!silent) {
      setIsInitialSync(isInitial);
      setCloudSyncProgress('Checking cloud for your data...');
    } else {
      setIsInitialSync(false); // Prevent full-screen modal
      console.log('🔄 Silent background sync starting...');
    }

    try {
      const cloudData = await fetchFullCloudData(userId);
      if (!cloudData.ok) {
        console.warn('Cloud sync failed:', cloudData.error);
        setIsCloudSyncing(false);
        if (!silent) {
          setCloudSyncProgress('');
        }
        return;
      }

      if (cloudData.categories.length === 0) {
        console.log('No cloud data found for this user');
        
        // Check if this is a brand new user (no local data either) — inject sample gallery
        // Only do this if user has never had data before (check user setting to avoid re-injecting)
        if (!hasLocalData) {
          const localStorageKey = `sample_gallery_shown_${userId}`;
          const shownLocally = localStorage.getItem(localStorageKey) === 'true';
          
          let shownInDb = false;
          try {
            const sampleShown = await getUserSetting(userId, 'sample_gallery_shown');
            shownInDb = sampleShown?.ok && sampleShown.value === 'true';
          } catch (err) {
            console.warn('Failed to check sample_gallery_shown setting:', err);
          }

          if (!shownLocally && !shownInDb) {
            console.log('🎉 New user detected — injecting sample gallery');
            setIsFirstTimeSetup(true);
            setCloudSyncProgress('Setting up your profile...');
            
            const sampleGallery = createSampleGallery();
            replaceAllCategories([sampleGallery]);
            
            // Mark that sample gallery has been shown (both localStorage and DB for reliability)
            localStorage.setItem(localStorageKey, 'true');
            await setUserSetting(userId, 'sample_gallery_shown', 'true');
            
            console.log('✅ Sample gallery injected');

            // Promote sample gallery to cloud in background (don't await — let UI render first)
            setTimeout(() => promoteSampleGallery(), 2000);
          }
        }
        
        // Still run cleanup even if no active categories exist
        // This handles the case where all categories are soft-deleted
        console.log('🧹 Running cleanup (no active categories)...');
        const cleanupResult = await runCleanup(userId, accessToken, deleteFromR2);
        console.log('🧹 Cleanup result:', cleanupResult);
        
        if (cleanupResult.ok) {
          const { deletedImages, deletedCategories, freedBytes, errors } = cleanupResult;
          if (deletedImages > 0 || deletedCategories > 0) {
            console.log(
              `Cleanup: ${deletedImages} images, ${deletedCategories} categories purged, ` +
              `${(freedBytes / 1024 / 1024).toFixed(2)} MB freed`
            );
          } else {
            console.log('Cleanup: nothing to purge');
          }
          if (errors && errors.length > 0) {
            console.warn('Cleanup errors:', errors);
          }
        } else {
          console.error('Cleanup failed:', cleanupResult.errors || cleanupResult.error);
        }
        
        setHasSyncedOnce(true);
        setIsCloudSyncing(false);
        if (!silent) {
          setCloudSyncProgress('');
        }
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
        await fullCloudPull(supabaseCategories, imagesByCategoryUid, imageTagsLookup, accessToken, silent);
      } else {
        // ---- INCREMENTAL MERGE: Merge cloud changes into existing local data ----
        await mergeCloudIntoLocal(supabaseCategories, supabaseImages, imagesByCategoryUid, imageTagsLookup, accessToken, userId, silent);
      }

      // After pull/merge, retry any local images that failed to upload to R2/Supabase
      if (!silent) {
        setCloudSyncProgress('Checking for unsynced local images...');
      }
      const retriedCount = await retryFailedUploads();
      if (retriedCount > 0) {
        console.log(`Retried ${retriedCount} failed/pending uploads during sync`);
      }

      // Run cleanup to purge soft-deleted records after sync
      if (!silent) {
        setCloudSyncProgress('Cleaning up deleted items...');
      }
      console.log('🧹 Starting cleanup...');
      const cleanupResult = await runCleanup(userId, accessToken, deleteFromR2);
      console.log('🧹 Cleanup result:', cleanupResult);
      
      if (cleanupResult.ok) {
        const { deletedImages, deletedCategories, freedBytes, errors } = cleanupResult;
        if (deletedImages > 0 || deletedCategories > 0) {
          console.log(
            `Sync cleanup: ${deletedImages} images, ${deletedCategories} categories purged, ` +
            `${(freedBytes / 1024 / 1024).toFixed(2)} MB freed`
          );
        } else {
          console.log('Cleanup: nothing to purge');
        }
        if (errors && errors.length > 0) {
          console.warn('Cleanup errors:', errors);
        }
      } else {
        console.error('Cleanup failed:', cleanupResult.errors || cleanupResult.error);
      }

      setHasSyncedOnce(true);
      setIsCloudSyncing(false);
      if (!silent) {
        setCloudSyncProgress('');
      }
      console.log('✅ Sync complete');
    } catch (err) {
      console.error('Cloud sync error:', err);
      setIsCloudSyncing(false);
      if (!silent) {
        setCloudSyncProgress('');
      }
    }
  };

  // Auto-sync on load (silent background sync)
  useEffect(() => {
    if (!session?.user?.id || categoriesLoading || isCloudSyncing) return;
    if (cloudSyncAttemptedRef.current) return;
    cloudSyncAttemptedRef.current = true;

    syncFromCloud({ silent: true });
  }, [session?.user?.id, categoriesLoading]);

  // First-time setup: wait for sample gallery to be in state, then complete setup and start tutorial
  useEffect(() => {
    if (!isFirstTimeSetup || firstTimeSetupComplete) return;
    
    // Check if sample gallery has been loaded into categories state
    const hasSampleGallery = categories.some(c => c.isSample);
    if (hasSampleGallery) {
      console.log('✅ Sample gallery confirmed in state — completing first-time setup');
      // Small delay to ensure DOM has rendered the gallery card (for tutorial targeting)
      setTimeout(() => {
        setFirstTimeSetupComplete(true);
        setIsFirstTimeSetup(false);
        setCloudSyncProgress('');
        // Tutorial will auto-start via useTutorial hook (checks tutorial_completed setting)
      }, 500);
    }
  }, [isFirstTimeSetup, firstTimeSetupComplete, categories]);

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
  const fullCloudPull = async (supabaseCategories, imagesByCategoryUid, imageTagsLookup, accessToken, silent = false) => {
    if (!silent) {
      setCloudSyncProgress(`Found ${supabaseCategories.length} categories, loading images...`);
    }

    const localCategories = [];
    let totalImages = 0;
    let loadedImages = 0;

    for (const cat of supabaseCategories) {
      totalImages += (imagesByCategoryUid[cat.uid] || []).length;
    }

    for (let catIdx = 0; catIdx < supabaseCategories.length; catIdx++) {
      const cat = supabaseCategories[catIdx];
      const catImages = imagesByCategoryUid[cat.uid] || [];

      if (!silent) {
        setCloudSyncProgress(
          `Loading "${cat.name}" (${catIdx + 1}/${supabaseCategories.length})...`
        );
      }

      // Fetch all images for this gallery in parallel
      const imageSrcs = await fetchImagesFromR2Parallel(catImages, accessToken, (done, total) => {
        const currentLoaded = loadedImages + done;
        if (!silent && (done % 3 === 0 || done === total)) {
          setCloudSyncProgress(`Loading images... ${currentLoaded}/${totalImages}`);
        }
      });
      loadedImages += catImages.length;

      const localImages = catImages.map((img, i) => ({
        src: imageSrcs[i],
        poseName: img.name || '',
        notes: img.notes || '',
        isFavorite: img.favorite || false,
        isCover: img.cover_image || false,
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
        coverImageUid: cat.cover_image_uid || null,
        coverPositionY: cat.cover_position_y ?? 50,
        images: localImages,
        isFavorite: cat.favorite || false,
        notes: cat.notes || '',
        isPrivate: cat.private_gallery || false,
        privatePassword: cat.gallery_password || null,
        supabaseUid: cat.uid,
      });
    }

    if (!silent) {
      setCloudSyncProgress('Saving to local storage...');
    }
    replaceAllCategories(localCategories);
    console.log(`Cloud sync complete: ${localCategories.length} categories, ${loadedImages} images`);
  };

  // Incremental merge — used when local data exists (page refresh / returning to app)
  const mergeCloudIntoLocal = async (supabaseCategories, supabaseImages, imagesByCategoryUid, imageTagsLookup, accessToken, userId, silent = false) => {
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

      if (!silent) {
        setCloudSyncProgress(`Syncing new category "${cloudCat.name}"...`);
      }

      const catImages = imagesByCategoryUid[cloudCat.uid] || [];

      // Fetch images in parallel
      const imageSrcs = await fetchImagesFromR2Parallel(catImages, accessToken);

      const localImages = catImages.map((img, i) => ({
        src: imageSrcs[i],
        poseName: img.name || '',
        notes: img.notes || '',
        isFavorite: img.favorite || false,
        isCover: img.cover_image || false,
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
        coverImageUid: cloudCat.cover_image_uid || null,
        coverPositionY: cloudCat.cover_position_y ?? 50,
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
      if ((cloudCat.cover_image_uid || null) !== localCat.coverImageUid) catUpdates.coverImageUid = cloudCat.cover_image_uid || null;
      if ((cloudCat.cover_position_y ?? 50) !== (localCat.coverPositionY ?? 50)) catUpdates.coverPositionY = cloudCat.cover_position_y ?? 50;

      if (Object.keys(catUpdates).length > 0) {
        updatedCategories[i] = { ...localCat, ...catUpdates };
        changed = true;
      }

      // Check for new images in this gallery from cloud
      const cloudImages = imagesByCategoryUid[localCat.supabaseUid] || [];
      const localImageUids = new Set(
        localCat.images.filter(img => img.supabaseUid).map(img => img.supabaseUid)
      );

      const newCloudImages = cloudImages.filter(ci => !localImageUids.has(ci.uid));
      if (newCloudImages.length > 0) {
        if (!silent) {
          setCloudSyncProgress(`Syncing ${newCloudImages.length} new images to "${localCat.name}"...`);
        }

        // Fetch new images in parallel
        const imageSrcs = await fetchImagesFromR2Parallel(newCloudImages, accessToken);

        const newLocalImages = newCloudImages.map((img, idx) => ({
          src: imageSrcs[idx],
          poseName: img.name || '',
          notes: img.notes || '',
          isFavorite: img.favorite || false,
          isCover: img.cover_image || false,
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
        const cloudCover = cloudImg.cover_image || false;
        const cloudTags = imageTagsLookup[cloudImg.uid] || [];

        if (cloudName !== localImg.poseName) imgUpdates.poseName = cloudName;
        if (cloudNotes !== localImg.notes) imgUpdates.notes = cloudNotes;
        if (cloudFav !== localImg.isFavorite) imgUpdates.isFavorite = cloudFav;
        if (cloudCover !== (localImg.isCover || false)) imgUpdates.isCover = cloudCover;
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

  // Load user grid preferences from user_settings table
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadGridPreferences = async () => {
      const userId = session.user.id;
      
      // Detect if mobile or desktop
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth < 768;
      const devicePrefix = isMobile ? 'mobile_' : 'desktop_';

      // Load category grid columns for current device
      const catResult = await getUserSetting(userId, `${devicePrefix}category_grid_columns`);
      if (catResult.ok && catResult.value) {
        setCategoryGridColumns(parseInt(catResult.value));
      }

      // Load image grid columns for current device
      const imgResult = await getUserSetting(userId, `${devicePrefix}image_grid_columns`);
      if (imgResult.ok && imgResult.value) {
        setGridColumns(parseInt(imgResult.value));
      }
      
      // Load filter preferences (for images)
      const sortByResult = await getUserSetting(userId, 'filter_sort_by');
      if (sortByResult?.ok && sortByResult.value) {
        setSortBy(sortByResult.value);
        if (sortByResult.value === 'favoritesOnly') {
          setShowFavoritesOnly(true);
        }
      }

      const tagFilterModeResult = await getUserSetting(userId, 'filter_tag_mode');
      if (tagFilterModeResult?.ok && tagFilterModeResult.value) {
        setTagFilterMode(tagFilterModeResult.value);
      }

      // Load gallery filter preferences
      const gallerySortResult = await getUserSetting(userId, 'gallery_sort_by');
      if (gallerySortResult?.ok && gallerySortResult.value) {
        setGallerySortBy(gallerySortResult.value);
      }
    };

    loadGridPreferences();
  }, [session?.user?.id]);

  // Handlers

  // Helper function to create timestamped filename for R2
  // Format: DDMMYYYYHHMMSS-originalname.ext
  // Example: 29012026235036-image_18.webp
  const createTimestampedFilename = (originalFilename) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${day}${month}${year}${hours}${minutes}${seconds}`;
    
    return `${timestamp}-${originalFilename}`;
  };

  const handleLogout = async () => {
    await logout();
    setViewMode('categories');
    setCurrentCategory(null);
  };

  // Save grid preferences to user_settings
  const handleCategoryGridChange = async (columns) => {
    setCategoryGridColumns(columns);
    if (session?.user?.id) {
      // Detect if mobile or desktop
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth < 768;
      const devicePrefix = isMobile ? 'mobile_' : 'desktop_';
      
      await setUserSetting(session.user.id, `${devicePrefix}category_grid_columns`, columns.toString());
    }
  };

  const handleImageGridChange = async (columns) => {
    setGridColumns(columns);
    if (session?.user?.id) {
      // Detect if mobile or desktop
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth < 768;
      const devicePrefix = isMobile ? 'mobile_' : 'desktop_';
      
      await setUserSetting(session.user.id, `${devicePrefix}image_grid_columns`, columns.toString());
    }
  };

  // Handle account deletion
  const handleAccountDeleted = async () => {
    try {
      // Clear IndexedDB properly with Promise
      await new Promise((resolve, reject) => {
        const dbRequest = indexedDB.deleteDatabase('PhotographyPoseGuide');
        dbRequest.onsuccess = () => {
          console.log('IndexedDB cleared after account deletion');
          resolve();
        };
        dbRequest.onerror = () => {
          console.error('Failed to clear IndexedDB');
          reject(new Error('Failed to clear IndexedDB'));
        };
        dbRequest.onblocked = () => {
          console.warn('IndexedDB deletion blocked');
          // Still resolve - blocked usually means it will clear eventually
          resolve();
        };
      });

      // Logout
      await logout();
      
      // Redirect to login
      window.location.href = '/';
    } catch (err) {
      console.error('Error in handleAccountDeleted:', err);
      // Even if there's an error, still logout and redirect
      await logout();
      window.location.href = '/';
    }
  };

  // Tutorial callback handler
  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextIndex);
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Tutorial completed or skipped
      completeTutorial();
    }
  };

  // Lower tutorial tooltip z-index when mobile upload modal is open (lets picker appear on top)
  // User can still see and click the Next button
  useEffect(() => {
    const joyrideTooltip = document.querySelector('.react-joyride__tooltip');
    const joyrideOverlay = document.querySelector('.react-joyride__overlay');
    if (showMobileUploadModal && runTutorial && stepIndex === 2) {
      if (joyrideTooltip) joyrideTooltip.style.zIndex = '1';
      if (joyrideOverlay) joyrideOverlay.style.zIndex = '1';
    } else {
      if (joyrideTooltip) joyrideTooltip.style.zIndex = '';
      if (joyrideOverlay) joyrideOverlay.style.zIndex = '';
    }
  }, [showMobileUploadModal, runTutorial, stepIndex]);

  // Image tutorial callback handler
  const handleImageJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      // Update step index
      setImageStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Tutorial completed or skipped
      completeImageTutorial();
    }
  };

  const handleBack = () => {
    window.history.back();
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
    window.history.pushState({ view: 'grid' }, '');
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
    window.history.pushState({ view: 'grid' }, '');
    setShowFavoritesOnly(false);
    setSelectedTagFilters([]);
    setTagFilterMode('include');
    setBulkSelectMode(false);
    setSelectedImages([]);
  };

  const handleOpenImage = (index) => {
    setCurrentImageIndex(index);
    setViewMode('single');
    window.history.pushState({ view: 'single' }, '');
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

    // Delete old cover photo from R2 and Supabase if it exists
    if (cat.coverR2Key) {
      deleteFromR2(cat.coverR2Key, session?.access_token)
        .then(result => {
          if (result.ok) {
            console.log(`Old cover photo deleted from R2: ${cat.coverR2Key}`);
          } else {
            console.error('Old cover photo R2 deletion failed:', result.error);
          }
        })
        .catch(err => console.error('Old cover photo R2 deletion error:', err));
    }

    // Soft-delete old cover image record in Supabase if it exists
    if (cat.coverImageUid) {
      deleteImageInSupabase(cat.coverImageUid, userId)
        .then(result => {
          if (result.ok) {
            console.log(`Old cover image record soft-deleted: ${cat.coverImageUid}`);
          } else {
            console.error('Old cover image Supabase deletion failed:', result.error);
          }
        })
        .catch(err => console.error('Old cover image Supabase deletion error:', err));
    }

    const baseFilename = (originalFilename || 'cover').replace(/\.[^/.]+$/, '') + '_cover.webp';
    const filename = createTimestampedFilename(baseFilename);

    try {
      // Upload new cover to R2
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
          isCover: true,
        },
        categoryUid,
        userId
      );

      if (imageResult.ok) {
        // Store coverImageUid locally so we can filter it from gallery
        updateCategory(categoryId, { coverImageUid: imageResult.uid });

        // Link cover_image_uid on the category in Supabase
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
    const rawFiles = Array.from(e.target.files);
    if (rawFiles.length === 0) return;

    // Filter to only valid image types
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.heif'];

    const files = [];
    const rejected = [];

    for (const file of rawFiles) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(ext)) {
        files.push(file);
      } else {
        rejected.push(file.name);
      }
    }

    // If all files were rejected, show warning and bail
    if (files.length === 0) {
      setRejectedFiles(rejected);
      setUploadProgress({ current: 0, total: 0 });
      setShowUploadProgress(true);
      setPendingUpload(null);
      e.target.value = '';
      return;
    }

    // Reset file input early
    e.target.value = '';

    // If there are rejected files, show warning first and wait for Continue
    if (rejected.length > 0) {
      setRejectedFiles(rejected);
      setUploadProgress({ current: 0, total: files.length });
      setShowUploadProgress(true);
      setPendingUpload({ files, categoryId });
      return;
    }

    // No rejected files — proceed directly
    await processUpload(files, categoryId);
  };

  // Continue upload after user acknowledges rejected files
  const handleContinueUpload = async () => {
    if (!pendingUpload) {
      setShowUploadProgress(false);
      setRejectedFiles(null);
      return;
    }
    const { files, categoryId } = pendingUpload;
    setRejectedFiles(null);
    setPendingUpload(null);
    await processUpload(files, categoryId);
  };

  // Core upload processing logic
  const processUpload = async (files, categoryId) => {
    // Check storage before upload
    if (session?.user?.id) {
      // Calculate total size of files to upload
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      const totalMB = totalBytes / (1024 * 1024);
      
      // Get current storage info
      const storageInfo = await getUserStorageInfo(session.user.id);
      
      if (storageInfo.ok) {
        const availableMB = storageInfo.availableMB;
        
        // Check if upload would exceed storage limit
        if (totalMB > availableMB) {
          // Show storage limit modal
          setStorageLimitInfo({
            requiredMB: totalMB,
            availableMB: availableMB,
            usedDisplay: storageInfo.usedDisplay,
            maxDisplay: storageInfo.maxDisplay
          });
          setShowStorageLimitModal(true);
          setShowUploadProgress(false);
          return;
        }
      }
    }

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
          const baseFilename = files[i].name.replace(/\.[^/.]+$/, '.webp');
          filenames.push(createTimestampedFilename(baseFilename));
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
          filenames.push(createTimestampedFilename(files[i].name));
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
              // Get current image state to check if user has customized the name
              const currentCategory = categoriesRef.current.find(c => c.id === categoryId);
              const currentImage = currentCategory?.images[imageIndex];
              const originalFilename = filenames[i];
              const currentPoseName = currentImage?.poseName;

              // Only set friendly name if user hasn't manually changed it from the original filename
              const hasCustomName = currentPoseName && currentPoseName !== originalFilename;

              if (hasCustomName) {
                // User has customized the name, just store the UID
                updateImage(categoryId, imageIndex, {
                  supabaseUid: supabaseResult.uid
                });
                console.log(`Supabase image created: ${supabaseResult.uid}, keeping user name: ${currentPoseName}`);
              } else {
                // Generate friendly poseName: "Gallery Name - UID"
                const friendlyName = `${currentCategory?.name || 'Image'} - ${supabaseResult.uid}`;

                // Store the Supabase UID and friendly poseName locally
                updateImage(categoryId, imageIndex, {
                  supabaseUid: supabaseResult.uid,
                  poseName: friendlyName
                });
                console.log(`Supabase image created: ${supabaseResult.uid}, named: ${friendlyName}`);

                // Update Supabase with the friendly poseName
                updateImageInSupabase(supabaseResult.uid, { poseName: friendlyName }, userId);
              }

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
        // Skip sample images — these are promoted separately by promoteSampleGallery
        if (img.r2Status === 'sample') continue;
        // Only retry images that failed or are still pending (have src but no r2Key)
        if (img.r2Key) continue;

        retried++;
        console.log(`Retrying upload for image ${imgIdx} in category "${cat.name}" (status: ${img.r2Status})`);
        updateImage(cat.id, imgIdx, { r2Status: 'uploading' });

        try {
          const baseFilename = img.poseName || `image-${imgIdx}`;
          const filename = baseFilename.match(/^\d{14}-/) ? baseFilename : createTimestampedFilename(baseFilename);
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
                // Check if user has customized the name (not the default fallback)
                const defaultFilename = `image-${imgIdx}`;
                const hasCustomName = img.poseName && img.poseName !== defaultFilename;

                if (hasCustomName) {
                  // User has customized the name, just store the UID
                  updateImage(cat.id, imgIdx, {
                    supabaseUid: supabaseResult.uid
                  });
                  console.log(`Retry Supabase record created: ${supabaseResult.uid}, keeping user name: ${img.poseName}`);
                } else {
                  // Generate friendly poseName: "Gallery Name - UID"
                  const friendlyName = `${cat.name || 'Image'} - ${supabaseResult.uid}`;

                  updateImage(cat.id, imgIdx, {
                    supabaseUid: supabaseResult.uid,
                    poseName: friendlyName
                  });
                  console.log(`Retry Supabase record created: ${supabaseResult.uid}, named: ${friendlyName}`);

                  // Update Supabase with the friendly poseName
                  updateImageInSupabase(supabaseResult.uid, { poseName: friendlyName }, userId);
                }

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

  // Promote sample gallery to cloud — fetches local sample images, creates Supabase category,
  // uploads images to R2, syncs tags, and flips isSample off so it behaves like a regular gallery.
  const promoteSampleGallery = async () => {
    const userId = session?.user?.id;
    const accessToken = session?.access_token;
    if (!userId || !accessToken) {
      console.warn('Cannot promote sample gallery: no session');
      return;
    }

    // Find the sample gallery in current state
    const sampleCat = categoriesRef.current.find(c => c.isSample);
    if (!sampleCat) {
      console.log('No sample gallery found to promote');
      return;
    }

    console.log('🚀 Promoting sample gallery to cloud...');

    try {
      // Step 1: Create the category in Supabase
      const categoryData = {
        name: sampleCat.name,
        notes: sampleCat.notes || '',
        isFavorite: sampleCat.isFavorite || false,
        isPrivate: sampleCat.isPrivate || false,
        galleryPassword: sampleCat.privatePassword || null,
      };

      const catResult = await createCategoryInSupabase(categoryData, userId);
      if (!catResult.ok) {
        console.error('Failed to create sample category in Supabase:', catResult.error);
        return;
      }

      const categoryUid = catResult.uid;
      updateCategory(sampleCat.id, { supabaseUid: categoryUid });
      console.log(`Sample category created in Supabase: ${categoryUid}`);

      // Sync category tags
      if (sampleCat.tags && sampleCat.tags.length > 0) {
        syncCategoryTags(categoryUid, sampleCat.tags, userId)
          .catch(err => console.error('Sample category tag sync error:', err));
      }

      // Step 2: Fetch each sample image from public folder and upload to R2
      for (let i = 0; i < sampleCat.images.length; i++) {
        const img = sampleCat.images[i];

        try {
          // Fetch the local sample image and convert to data URL
          const response = await fetch(img.src);
          if (!response.ok) {
            console.warn(`Failed to fetch sample image: ${img.src}`);
            updateImage(sampleCat.id, i, { r2Status: 'failed' });
            continue;
          }

          const blob = await response.blob();
          const dataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
          });

          // Upload to R2
          const filename = createTimestampedFilename(`sample-pose-${String(i + 1).padStart(2, '0')}.webp`);
          updateImage(sampleCat.id, i, { r2Status: 'uploading' });

          const r2Result = await uploadSingleToR2WithRetry(dataURL, filename, accessToken);
          if (!r2Result.ok) {
            console.error(`Sample image R2 upload failed (${i + 1}):`, r2Result.error);
            updateImage(sampleCat.id, i, { r2Status: 'failed' });
            continue;
          }

          // Update local state with R2 key
          updateImage(sampleCat.id, i, {
            r2Key: r2Result.key,
            r2Status: 'uploaded',
            size: r2Result.size || 0,
            src: dataURL, // Replace relative path with actual data URL
          });

          // Create image record in Supabase
          const supabaseResult = await createImageInSupabase(
            {
              r2Key: r2Result.key,
              size: r2Result.size,
              poseName: img.poseName,
              notes: img.notes || '',
              isFavorite: img.isFavorite || false,
            },
            categoryUid,
            userId
          );

          if (supabaseResult.ok) {
            updateImage(sampleCat.id, i, { supabaseUid: supabaseResult.uid });
            console.log(`Sample image ${i + 1} synced: ${supabaseResult.uid}`);

            // Sync image tags
            if (img.tags && img.tags.length > 0) {
              syncImageTags(supabaseResult.uid, img.tags, userId)
                .catch(err => console.error(`Sample image ${i + 1} tag sync error:`, err));
            }

            // Update user storage tracking
            updateUserStorage(userId, r2Result.size);
          } else {
            console.error(`Sample image ${i + 1} Supabase create failed:`, supabaseResult.error);
          }
        } catch (err) {
          console.error(`Sample image ${i + 1} promotion error:`, err);
          updateImage(sampleCat.id, i, { r2Status: 'failed' });
        }
      }

      // Step 3: Upload cover image
      try {
        const coverResponse = await fetch(sampleCat.cover);
        if (coverResponse.ok) {
          const coverBlob = await coverResponse.blob();
          const coverDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(coverBlob);
          });
          await uploadCoverAndLink(coverDataUrl, sampleCat.id, 'sample-cover.webp');
        }
      } catch (err) {
        console.error('Failed to promote sample cover:', err);
      }

      // Step 4: Flip isSample off so it's treated as a regular gallery
      updateCategory(sampleCat.id, { isSample: false });
      forceSave();

      console.log('✅ Sample gallery promoted to cloud');
    } catch (err) {
      console.error('Sample gallery promotion failed:', err);
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

      // Delete from R2 immediately if r2Key exists
      if (image.r2Key && session?.access_token) {
        deleteFromR2(image.r2Key, session.access_token)
          .then(result => {
            if (result.ok) {
              console.log(`Image deleted from R2: ${image.r2Key}`);
            } else {
              console.error('Image R2 deletion failed:', result.error);
            }
          })
          .catch(err => console.error('Image R2 deletion error:', err));
      }

      // Soft-delete in Supabase if image has a Supabase UID
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

              // Sync tags if any were provided
              if (addedCat.tags && addedCat.tags.length > 0) {
                syncCategoryTags(result.uid, addedCat.tags, userId)
                  .catch(err => console.error('Category tag sync error:', err));
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
      // Delete cover photo from R2 if it exists
      if (cat.coverR2Key) {
        deleteFromR2(cat.coverR2Key, session?.access_token)
          .then(result => {
            if (result.ok) {
              console.log(`Cover photo deleted from R2: ${cat.coverR2Key}`);
            } else {
              console.error('Cover photo R2 deletion failed:', result.error);
            }
          })
          .catch(err => console.error('Cover photo R2 deletion error:', err));
      }

      // Soft-delete cover image record in Supabase if it exists
      if (cat.coverImageUid) {
        deleteImageInSupabase(cat.coverImageUid, userId)
          .catch(err => console.error('Supabase cover image delete error:', err));
      }

      // Delete all gallery images from R2 AND soft-delete in Supabase
      for (const image of (cat.images || [])) {
        // Delete from R2 immediately if r2Key exists
        if (image.r2Key) {
          deleteFromR2(image.r2Key, session?.access_token)
            .then(result => {
              if (result.ok) {
                console.log(`Gallery image deleted from R2: ${image.r2Key}`);
              } else {
                console.error('Gallery image R2 deletion failed:', result.error);
              }
            })
            .catch(err => console.error('Gallery image R2 deletion error:', err));
        }

        // Soft-delete in Supabase
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
    
    // Force save to IndexedDB to persist the deletion
    await forceSave();
    console.log(`Category ${categoryId} deleted and saved to IndexedDB`);
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

  const handleSetSortBy = async (value) => {
    if (value === 'favoritesOnly') {
      setSortBy('favorites');
      setShowFavoritesOnly(true);
    } else {
      setSortBy(value);
      setShowFavoritesOnly(false);
    }
    
    // Save preference
    if (session?.user?.id) {
      await setUserSetting(session.user.id, 'filter_sort_by', value);
    }
  };

  const handleSetFilterMode = async (mode) => {
    setTagFilterMode(mode);
    
    // Save preference
    if (session?.user?.id) {
      await setUserSetting(session.user.id, 'filter_tag_mode', mode);
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
          if (bulkUpdates.notes !== undefined) {
            // Handle append vs replace mode for notes
            if (bulkUpdates.notesMode === 'append' && image.notes) {
              metaUpdates.notes = `${image.notes}\n${bulkUpdates.notes}`;
            } else {
              metaUpdates.notes = bulkUpdates.notes;
            }
          }
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

    // Delete from R2 and soft-delete in Supabase before removing locally
    if (userId) {
      const cat = categoriesRef.current.find(c => c.id === currentCategory.id);
      if (cat) {
        for (const imageIndex of selectedImages) {
          const image = cat.images[imageIndex];
          if (!image) continue;

          // Delete from R2 immediately if r2Key exists
          if (image.r2Key && session?.access_token) {
            deleteFromR2(image.r2Key, session.access_token)
              .then(result => {
                if (result.ok) {
                  console.log(`Bulk delete: Image deleted from R2: ${image.r2Key}`);
                } else {
                  console.error('Bulk delete: R2 deletion failed:', result.error);
                }
              })
              .catch(err => console.error('Bulk delete: R2 deletion error:', err));
          }

          // Soft-delete in Supabase
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

  // ==========================================
  // GALLERY FILTERING AND BULK EDIT HANDLERS
  // ==========================================

  const handleGalleryTagToggle = (tag) => {
    if (selectedGalleryTagFilters.includes(tag)) {
      setSelectedGalleryTagFilters(selectedGalleryTagFilters.filter(t => t !== tag));
    } else {
      setSelectedGalleryTagFilters([...selectedGalleryTagFilters, tag]);
    }
  };

  const handleSetGallerySortBy = async (value) => {
    setGallerySortBy(value);

    // Save preference
    if (session?.user?.id) {
      await setUserSetting(session.user.id, 'gallery_sort_by', value);
    }
  };

  const handleClearGalleryFilters = () => {
    setSelectedGalleryTagFilters([]);
    setGallerySortBy('nameAZ');
    setGallerySearchTerm('');
  };

  const handleGallerySelect = (categoryId) => {
    if (selectedGalleries.includes(categoryId)) {
      setSelectedGalleries(selectedGalleries.filter(id => id !== categoryId));
    } else {
      setSelectedGalleries([...selectedGalleries, categoryId]);
    }
  };

  const handleStartGalleryBulkSelect = (categoryId) => {
    setGalleryBulkSelectMode(true);
    setSelectedGalleries([categoryId]);
  };

  const handleGalleryBulkEdit = async (updates) => {
    const userId = session?.user?.id;

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
    bulkUpdateCategories(selectedGalleries, bulkUpdates);

    // Sync to Supabase in background
    if (userId) {
      for (const categoryId of selectedGalleries) {
        const cat = categoriesRef.current.find(c => c.id === categoryId);
        if (!cat?.supabaseUid) continue;

        // Sync metadata updates
        const metaUpdates = {};
        if (bulkUpdates.notes !== undefined) {
          if (bulkUpdates.notesMode === 'append' && cat.notes) {
            metaUpdates.notes = `${cat.notes}\n${bulkUpdates.notes}`;
          } else {
            metaUpdates.notes = bulkUpdates.notes;
          }
        }
        if (bulkUpdates.isFavorite !== undefined) {
          metaUpdates.isFavorite = bulkUpdates.isFavorite;
        }

        if (Object.keys(metaUpdates).length > 0) {
          updateCategoryInSupabase(cat.supabaseUid, metaUpdates, userId)
            .catch(err => console.error('Gallery bulk edit Supabase sync error:', err));
        }

        // Sync tags
        if (bulkUpdates.tags && bulkUpdates.tags.length > 0) {
          const existingTags = cat.tags || [];
          const mergedTags = [...new Set([...existingTags, ...bulkUpdates.tags])];
          syncCategoryTags(cat.supabaseUid, mergedTags, userId)
            .catch(err => console.error('Gallery bulk edit tag sync error:', err));
        }
      }
    }

    setGalleryBulkSelectMode(false);
    setSelectedGalleries([]);
  };

  const handleGalleryBulkDelete = async () => {
    const userId = session?.user?.id;

    // Delete from R2 and soft-delete in Supabase before removing locally
    for (const categoryId of selectedGalleries) {
      const cat = categoriesRef.current.find(c => c.id === categoryId);
      if (!cat) continue;

      // Delete cover photo from R2 if it exists
      if (cat.coverR2Key && session?.access_token) {
        deleteFromR2(cat.coverR2Key, session.access_token)
          .catch(err => console.error('Gallery bulk delete: Cover R2 deletion error:', err));
      }

      // Soft-delete cover image in Supabase
      if (cat.coverImageUid && userId) {
        deleteImageInSupabase(cat.coverImageUid, userId)
          .catch(err => console.error('Gallery bulk delete: Cover Supabase error:', err));
      }

      // Delete all gallery images from R2 AND soft-delete in Supabase
      for (const image of (cat.images || [])) {
        if (image.r2Key && session?.access_token) {
          deleteFromR2(image.r2Key, session.access_token)
            .catch(err => console.error('Gallery bulk delete: Image R2 error:', err));
        }

        let imageUid = image.supabaseUid;
        if (!imageUid && image.r2Key && userId) {
          const lookup = await findImageByR2Key(image.r2Key, userId);
          if (lookup.ok) imageUid = lookup.uid;
        }
        if (imageUid && userId) {
          deleteImageInSupabase(imageUid, userId)
            .catch(err => console.error('Gallery bulk delete: Image Supabase error:', err));
        }
      }

      // Soft-delete the category itself
      if (cat.supabaseUid && userId) {
        deleteCategoryInSupabase(cat.supabaseUid, userId)
          .catch(err => console.error('Gallery bulk delete: Category Supabase error:', err));
      }
    }

    // Delete locally
    bulkDeleteCategories(selectedGalleries);

    // Force save
    await forceSave();

    setGalleryBulkSelectMode(false);
    setSelectedGalleries([]);
    setShowGalleryBulkEditModal(false);
  };

  // Get current category data
  const category = currentCategory ? categories.find(c => c.id === currentCategory.id) : null;

  // Get displayed categories with filtering
  const displayedCategories = getDisplayedCategories(categories, {
    searchTerm: gallerySearchTerm,
    selectedTagFilters: selectedGalleryTagFilters,
    tagFilterMode: galleryTagFilterMode,
    sortBy: gallerySortBy
  });

  // Get all gallery tags
  const allGalleryTags = getAllGalleryTags(categories);

  // Get displayed images (already includes _originalIndex from helpers.js)
  const displayedImages = category ? getDisplayedImages(category, {
    selectedTagFilters,
    tagFilterMode,
    showFavoritesOnly,
    sortBy,
    searchTerm
  }) : [];

  // Extract mapping array for backward compatibility
  const displayedToOriginalIndex = displayedImages.map(img => img._originalIndex);

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

  // First-time setup loading screen (shown while sample gallery is being injected)
  if (isFirstTimeSetup && !firstTimeSetupComplete) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-5xl mb-4">📸</div>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold mb-2">Setting up your profile...</p>
          <p className="text-gray-400 text-sm">Preparing your sample gallery and getting things ready.</p>
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
        onShowMobileUpload={(categoryId) => setShowMobileUploadModal(categoryId)}
        onSync={() => syncFromCloud({ isInitial: false, silent: true })}
        onLogout={handleLogout}
        onOpenSettings={() => setShowUserSettings(true)}
        userId={session?.user?.id}
        isUploading={showUploadProgress}
        isSaving={isSaving}
        isSyncing={isCloudSyncing}
        isSynced={hasSyncedOnce && !isCloudSyncing}
      />

      {viewMode === 'categories' && (
        <CategoryGrid
          categories={displayedCategories}
          categoryGridColumns={categoryGridColumns}
          showCategoryGridDropdown={showCategoryGridDropdown}
          categoryDropdownRef={categoryDropdownRef}
          onToggleGridDropdown={() => setShowCategoryGridDropdown(!showCategoryGridDropdown)}
          onSetGridColumns={(cols) => {
            handleCategoryGridChange(cols);
            setShowCategoryGridDropdown(false);
          }}
          onOpenCategory={handleOpenCategory}
          onToggleFavorite={toggleCategoryFavoriteWithSync}
          onUploadImages={handleImagesUpload}
          onShowMobileUpload={(categoryId) => setShowMobileUploadModal(categoryId)}
          onEditSettings={(catId) => setEditingCategory(catId)}
          onUploadCover={handleCoverUpload}
          onDelete={(catId) => {
            setShowDeleteConfirm(catId);
          }}
          onGeneratePDF={(category) => setPdfCategory(category)}
          // Gallery filtering props
          searchTerm={gallerySearchTerm}
          onSearchChange={setGallerySearchTerm}
          selectedTagFilters={selectedGalleryTagFilters}
          onShowFilterModal={() => setShowGalleryFilterModal(true)}
          // Gallery bulk edit props
          bulkSelectMode={galleryBulkSelectMode}
          selectedGalleries={selectedGalleries}
          onToggleBulkSelect={() => {
            setGalleryBulkSelectMode(!galleryBulkSelectMode);
            setSelectedGalleries([]);
          }}
          onSelectGallery={handleGallerySelect}
          onStartBulkSelect={handleStartGalleryBulkSelect}
          onShowBulkEdit={() => setShowGalleryBulkEditModal(true)}
        />
      )}

      {viewMode === 'grid' && category && (
        <ImageGrid
          category={category}
          images={displayedImages}
          originalImages={category.images}
          displayedToOriginalIndex={displayedToOriginalIndex}
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
          onShowMobileUpload={(categoryId) => setShowMobileUploadModal(categoryId)}
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
            handleImageGridChange(cols);
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

      {viewMode === 'single' && category && category.images.length > 0 && (() => {
        // Create a category with sorted images for the viewer
        const sortedCategory = { ...category, images: displayedImages };
        return (
          <SingleImageView
            image={displayedImages[currentImageIndex]}
            currentIndex={currentImageIndex}
            totalImages={displayedImages.length}
            categoryName={category.name}
            category={sortedCategory}
            onClose={() => window.history.back()}
            onToggleFavorite={(swiperIndex) => {
              // swiperIndex comes from SingleImageView's activeIndex (the actual visible slide)
              const idx = swiperIndex !== undefined ? swiperIndex : currentImageIndex;
              const currentImage = displayedImages[idx];
              const originalIndex = currentImage._originalIndex;
              handleToggleFavorite(category.id, originalIndex);
            }}
            onPrevious={() => setCurrentImageIndex(currentImageIndex - 1)}
            onNext={() => setCurrentImageIndex(currentImageIndex + 1)}
            onUpdateImage={(catId, swiperIndex, updates) => {
              // swiperIndex comes from SingleImageView's activeIndex
              const currentImage = displayedImages[swiperIndex];
              const originalIndex = currentImage._originalIndex;
              updateImageWithSync(catId, originalIndex, updates);
            }}
          />
        );
      })()}

      {/* Modals */}
      {showNewCategoryModal && (
        <NewCategoryModal
          onClose={() => setShowNewCategoryModal(false)}
          allGalleryTags={allGalleryTags}
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
            allGalleryTags={allGalleryTags}
            onClose={() => setEditingCategory(null)}
            onSave={handleSaveCategorySettings}
            onUploadCover={handleCoverUpload}
            onDelete={(catId) => {
              setEditingCategory(null);
              setShowDeleteConfirm(catId);
            }}
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
          onSetFilterMode={handleSetFilterMode}
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

      {/* Gallery Filter Modal */}
      {showGalleryFilterModal && (
        <GalleryFilterModal
          sortBy={gallerySortBy}
          allGalleryTags={allGalleryTags}
          selectedTagFilters={selectedGalleryTagFilters}
          tagFilterMode={galleryTagFilterMode}
          onSetSortBy={handleSetGallerySortBy}
          onSetFilterMode={setGalleryTagFilterMode}
          onToggleTag={handleGalleryTagToggle}
          onClearFilters={handleClearGalleryFilters}
          onClose={() => setShowGalleryFilterModal(false)}
        />
      )}

      {/* Gallery Bulk Edit Modal */}
      {showGalleryBulkEditModal && selectedGalleries.length > 0 && (
        <GalleryBulkEditModal
          selectedCount={selectedGalleries.length}
          selectedGalleries={selectedGalleries.map(id => categories.find(c => c.id === id))}
          allGalleryTags={allGalleryTags}
          onClose={() => setShowGalleryBulkEditModal(false)}
          onApply={handleGalleryBulkEdit}
          onDelete={handleGalleryBulkDelete}
        />
      )}

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isVisible={showUploadProgress}
        currentImage={uploadProgress.current}
        totalImages={uploadProgress.total}
        isComplete={uploadComplete}
        rejectedFiles={rejectedFiles}
        onContinueUpload={handleContinueUpload}
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

      {/* Mobile Upload Modal */}
      {showMobileUploadModal && (
        <MobileUploadModal
          categoryId={showMobileUploadModal}
          onUpload={handleImagesUpload}
          onClose={() => setShowMobileUploadModal(null)}
        />
      )}

      {/* Storage Limit Modal */}
      {showStorageLimitModal && storageLimitInfo && (
        <StorageLimitModal
          requiredMB={storageLimitInfo.requiredMB}
          availableMB={storageLimitInfo.availableMB}
          usedDisplay={storageLimitInfo.usedDisplay}
          maxDisplay={storageLimitInfo.maxDisplay}
          onClose={() => {
            setShowStorageLimitModal(false);
            setStorageLimitInfo(null);
          }}
        />
      )}

      {/* User Settings Modal */}
      {showUserSettings && (
        <UserSettingsModal
          onClose={() => setShowUserSettings(false)}
          currentUser={session?.user}
          categoryGridColumns={categoryGridColumns}
          imageGridColumns={gridColumns}
          onCategoryGridChange={handleCategoryGridChange}
          onImageGridChange={handleImageGridChange}
          onAccountDeleted={handleAccountDeleted}
          deleteFromR2={deleteFromR2}
          accessToken={session?.access_token}
          onStartTutorial={async () => {
            // Clear tutorial completion flag
            if (session?.user?.id) {
              await setUserSetting(session.user.id, 'tutorial_completed', 'false');
            }
            
            // Just start from the beginning
            startTutorial();
          }}
          onResetImageTutorial={resetImageTutorial}
        />
      )}

      {/* Tutorial Overlay */}
      {!tutorialLoading && (
        <Joyride
          steps={tutorialSteps}
          run={runTutorial && !isFirstTimeSetup}
          stepIndex={stepIndex}
          continuous
          showProgress
          showSkipButton
          disableScrolling={false}
          disableScrollParentFix
          scrollToFirstStep
          scrollOffset={100}
          spotlightPadding={10}
          disableOverlayClose
          hideCloseButton
          callback={handleJoyrideCallback}
          styles={tutorialStyles}
          locale={{
            back: 'Back',
            close: 'Close',
            last: 'Finish',
            next: 'Next',
            skip: 'Skip Tutorial',
          }}
        />
      )}

      {/* Image Gallery Tutorial Overlay */}
      {!imageTutorialLoading && (
        <Joyride
          steps={imageTutorialSteps}
          run={runImageTutorial}
          stepIndex={imageStepIndex}
          continuous
          showProgress
          showSkipButton
          disableScrolling={false}
          disableScrollParentFix
          scrollToFirstStep
          scrollOffset={100}
          spotlightPadding={10}
          disableOverlayClose
          hideCloseButton
          callback={handleImageJoyrideCallback}
          styles={tutorialStyles}
          locale={{
            back: 'Back',
            close: 'Close',
            last: 'Finish',
            next: 'Next',
            skip: 'Skip Tutorial',
          }}
        />
      )}

    </div>
  );
}
