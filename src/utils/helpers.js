// Helper functions for categories and images

export const getAllTags = (categories) => {
  const allTags = new Set();
  categories.forEach(cat => {
    cat.images.forEach(img => {
      if (img.tags) {
        img.tags.forEach(tag => allTags.add(tag));
      }
    });
  });
  return Array.from(allTags).sort();
};

export const getCategoryTags = (categories, categoryId) => {
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return [];
  const tags = new Set();
  cat.images.forEach(img => {
    if (img.tags) {
      img.tags.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags).sort();
};

export const getDisplayedCategories = (categories, showFavoriteCategoriesOnly) => {
  // Sort: favorites first, then others
  const sorted = [...categories].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

  // Filter if showing favorites only
  return showFavoriteCategoriesOnly ? sorted.filter(cat => cat.isFavorite) : sorted;
};

export const getDisplayedImages = (category, filters) => {
  const { selectedTagFilters, tagFilterMode, showFavoritesOnly, sortBy, searchTerm } = filters;

  if (!category) return [];

  let sorted = [...category.images];

  // Filter by search term first
  if (searchTerm && searchTerm.trim()) {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    sorted = sorted.filter(img => {
      // Search in pose name
      if (img.poseName && img.poseName.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }
      // Search in tags
      if (img.tags && img.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))) {
        return true;
      }
      // Search in notes
      if (img.notes && img.notes.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }
      return false;
    });
  }

  // Filter by tags if any are selected
  if (selectedTagFilters.length > 0) {
    if (tagFilterMode === 'include') {
      sorted = sorted.filter(img =>
        img.tags && selectedTagFilters.every(tag => img.tags.includes(tag))
      );
    } else {
      sorted = sorted.filter(img =>
        !img.tags || !selectedTagFilters.some(tag => img.tags.includes(tag))
      );
    }
  }
  
  // Then filter by favorites if enabled
  if (showFavoritesOnly) {
    sorted = sorted.filter(img => img.isFavorite);
  }
  
  // Finally sort based on selected option
  if (sortBy === 'favorites') {
    sorted.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });
  } else if (sortBy === 'dateAdded') {
    sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  } else if (sortBy === 'dateAddedOldest') {
    sorted.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
  }

  return sorted;
};

export const getGridColsClass = (gridColumns) => {
  return {
    1: 'grid-cols-1',
	2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  }[gridColumns] || 'grid-cols-3';
};

export const getCategoryGridColsClass = (categoryGridColumns) => {
  return {
    1: 'grid-cols-1',
	2: 'grid-cols-2',
    3: 'grid-cols-3 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }[categoryGridColumns] || 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
};

export const initializeDefaultCategories = () => {
  return [
    { id: 1, name: "Men's Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 2, name: "Women's Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 3, name: "Couples Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 4, name: "Couples & Pet Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 5, name: "Family Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 6, name: "Siblings Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 7, name: "Engagement Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 8, name: "Maternity Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 9, name: "Newborn Poses", cover: null, images: [], isFavorite: false, notes: '' },
    { id: 10, name: "Boudoir Poses", cover: null, images: [], isFavorite: false, notes: '' }
  ];
};
