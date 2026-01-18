import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { initializeDefaultCategories } from '../utils/helpers';

export const useCategories = (currentUser) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadFromStorage();
    }
  }, [currentUser]);

  // Save to storage whenever categories change
  useEffect(() => {
    if (!isLoading && categories.length > 0 && currentUser) {
      saveToStorage();
    }
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
        setCategories(initializeDefaultCategories());
      }
    } catch (error) {
      console.log('No saved data found, initializing defaults');
      setCategories(initializeDefaultCategories());
    } finally {
      setIsLoading(false);
    }
  };

  const saveToStorage = async () => {
    try {
      await storage.set(`categories:${currentUser}`, JSON.stringify(categories));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const addCategory = (name) => {
    const newId = Math.max(...categories.map(c => c.id), 0) + 1;
    setCategories([...categories, {
      id: newId,
      name: name,
      cover: null,
      images: [],
      isFavorite: false,
      notes: ''
    }]);
  };

  const updateCategory = (categoryId, updates) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId ? { ...cat, ...updates } : cat
    ));
  };

  const deleteCategory = (categoryId) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
  };

  const toggleCategoryFavorite = (categoryId) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId ? { ...cat, isFavorite: !cat.isFavorite } : cat
    ));
  };

  const addImages = (categoryId, newImages) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId ? { ...cat, images: [...cat.images, ...newImages] } : cat
    ));
  };

  const updateImage = (categoryId, imageIndex, updates) => {
    setCategories(categories.map(cat =>
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
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? { ...cat, images: cat.images.filter((_, i) => i !== imageIndex) }
        : cat
    ));
  };

  const bulkUpdateImages = (categoryId, imageIndices, updates) => {
    setCategories(categories.map(cat =>
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

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryFavorite,
    addImages,
    updateImage,
    deleteImage,
    bulkUpdateImages
  };
};
