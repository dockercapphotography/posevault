import { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';

export const useCategories = (currentUser) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const latestCategoriesRef = useRef(categories);

  useEffect(() => {
    if (currentUser) {
      loadFromStorage();
    }
  }, [currentUser]);

  // Keep ref up to date with latest categories
  useEffect(() => {
    latestCategoriesRef.current = categories;
  }, [categories]);

  // Debounced save - prevents multiple rapid saves during uploads
  useEffect(() => {
    if (!isLoading && categories.length > 0 && currentUser) {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce: wait 500ms after last change before saving
      // Capture categories in the closure to avoid stale data
      const categoriesToSave = categories;
      saveTimeoutRef.current = setTimeout(() => {
        saveToStorage(categoriesToSave);
      }, 500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [categories, isLoading, currentUser]);

  const loadFromStorage = async () => {
    setIsLoading(true);
    try {
      const result = await storage.get(`categories:${currentUser}`);
      if (result && result.value) {
        const savedCategories = JSON.parse(result.value);
        // Migration: Add missing fields
        const migratedCategories = savedCategories.map(cat => ({
          ...cat,
          notes: cat.notes || '',
          images: cat.images.map(img => ({
            ...img,
            dateAdded: img.dateAdded || new Date().toISOString(),
            tags: img.tags || [],
            notes: img.notes || ''
          }))
        }));
        setCategories(migratedCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.log('No saved data found, starting with empty categories');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToStorage = async (categoriesToSave) => {
    if (isSaving) {
      console.log('Save already in progress, queuing this save...');
      // Queue this save to run after the current one completes
      pendingSaveRef.current = categoriesToSave;
      return;
    }

    setIsSaving(true);
    try {
      await storage.set(`categories:${currentUser}`, JSON.stringify(categoriesToSave));
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Failed to save data:', error);

      // Check if it's a quota exceeded error
      if (error.message && error.message.includes('quota')) {
        console.error('Storage quota exceeded! Consider deleting unused images.');
      }
    } finally {
      setIsSaving(false);

      // If there was a pending save queued, execute it now
      if (pendingSaveRef.current) {
        console.log('Executing queued save...');
        const queuedData = pendingSaveRef.current;
        pendingSaveRef.current = null;
        // Use setTimeout to avoid synchronous recursion
        setTimeout(() => saveToStorage(queuedData), 0);
      }
    }
  };

  const addCategory = (name, privateSettings = {}) => {
    setCategories(prev => {
      const newId = Math.max(...prev.map(c => c.id), 0) + 1;
      return [...prev, {
        id: newId,
        name: name,
        cover: privateSettings.cover || null,
        images: [],
        isFavorite: false,
        notes: privateSettings.notes || '',
        tags: privateSettings.tags || [],
        isPrivate: privateSettings.isPrivate || false,
        privatePassword: privateSettings.privatePassword || null,
      }];
    });
  };

  const updateCategory = (categoryId, updates) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, ...updates } : cat
    ));
  };

  const deleteCategory = (categoryId) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const toggleCategoryFavorite = (categoryId) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, isFavorite: !cat.isFavorite } : cat
    ));
  };

  const addImages = (categoryId, newImages) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, images: [...cat.images, ...newImages] } : cat
    ));
  };

  const updateImage = (categoryId, imageIndex, updates) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            images: cat.images.map((img, idx) =>
              idx === imageIndex ? { ...img, ...updates } : img
            )
          }
        : cat
    ));
  };

  const deleteImage = (categoryId, imageIndex) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, images: cat.images.filter((_, i) => i !== imageIndex) }
        : cat
    ));
  };

  const bulkUpdateImages = (categoryId, imageIndices, updates) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            images: cat.images.map((img, idx) => {
              if (imageIndices.includes(idx)) {
                // Handle tags
                if (updates.tags) {
                  const existingTags = img.tags || [];
                  const combined = [...new Set([...existingTags, ...updates.tags])];
                  img = { ...img, tags: combined };
                }
                // Handle notes
                if (updates.notes !== undefined) {
                  if (updates.notesMode === 'append') {
                    img = { ...img, notes: img.notes ? `${img.notes}\n${updates.notes}` : updates.notes };
                  } else if (updates.notesMode === 'replace') {
                    img = { ...img, notes: updates.notes };
                  }
                }
                // Handle favorites
                if (updates.isFavorite !== undefined) {
                  img = { ...img, isFavorite: updates.isFavorite };
                }
                return img;
              }
              return img;
            })
          }
        : cat
    ));
  };

  const bulkDeleteImages = (categoryId, imageIndices) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, images: cat.images.filter((_, i) => !imageIndices.includes(i)) }
        : cat
    ));
  };

  // Bulk update categories (for gallery bulk edit)
  const bulkUpdateCategories = (categoryIds, updates) => {
    setCategories(prev => prev.map(cat => {
      if (!categoryIds.includes(cat.id)) return cat;

      let updatedCat = { ...cat };

      // Handle tags - merge with existing
      if (updates.tags && updates.tags.length > 0) {
        const existingTags = cat.tags || [];
        updatedCat.tags = [...new Set([...existingTags, ...updates.tags])];
      }

      // Handle notes
      if (updates.notes !== undefined && updates.notes.trim()) {
        if (updates.notesMode === 'append') {
          updatedCat.notes = cat.notes ? `${cat.notes}\n${updates.notes}` : updates.notes;
        } else if (updates.notesMode === 'replace') {
          updatedCat.notes = updates.notes;
        }
      }

      // Handle favorites
      if (updates.isFavorite !== undefined) {
        updatedCat.isFavorite = updates.isFavorite;
      }

      return updatedCat;
    }));
  };

  // Bulk delete categories (for gallery bulk edit)
  const bulkDeleteCategories = (categoryIds) => {
    setCategories(prev => prev.filter(cat => !categoryIds.includes(cat.id)));
  };

  // Replace all categories (used by cloud sync to populate local state)
  const replaceAllCategories = (newCategories) => {
    setCategories(newCategories);
  };

  const forceSave = async () => {
    // Force immediate save using the latest categories from ref
    // This ensures we always save the most up-to-date data
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Use ref to get the absolute latest categories, even if state hasn't updated yet
    await saveToStorage(latestCategoriesRef.current);
  };

  return {
    categories,
    categoriesRef: latestCategoriesRef,
    isLoading,
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
  };
};
