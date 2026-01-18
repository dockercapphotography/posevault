import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Upload, Trash2, Heart, LayoutGrid, Plus, X, ChevronDown, LogOut, Eye, EyeOff, Images, Camera, Grid3x3, Settings, Tag, FileText, Calendar, Filter, CheckSquare } from 'lucide-react';

export default function PhotographyPoseGuide() {
  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState('categories');
  const [isLoading, setIsLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [gridColumns, setGridColumns] = useState(3);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showGridDropdown, setShowGridDropdown] = useState(false);
  const [categoryGridColumns, setCategoryGridColumns] = useState(3);
  const [showCategoryGridDropdown, setShowCategoryGridDropdown] = useState(false);
  const [showFavoriteCategoriesOnly, setShowFavoriteCategoriesOnly] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSymbol: false
  });
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(null);
  const [sortBy, setSortBy] = useState('dateAdded'); // dateAdded, dateAddedOldest, favorites
  const [editingImage, setEditingImage] = useState(null); // {categoryId, imageIndex}
  const [tagInput, setTagInput] = useState('');
  const [localNotes, setLocalNotes] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState([]); // Array of tags to filter by
  const [tagFilterMode, setTagFilterMode] = useState('include'); // 'include' or 'exclude'
  const [showTagFilterModal, setShowTagFilterModal] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]); // Array of image indices
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState([]);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkNotesMode, setBulkNotesMode] = useState('append'); // append or replace
  const [bulkFavoriteAction, setBulkFavoriteAction] = useState('noChange'); // noChange, favorite, unfavorite
  const dropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  // Close dropdown when clicking outside
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

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Update password requirements when password changes
  useEffect(() => {
    if (isRegistering) {
      setPasswordRequirements({
        minLength: password.length >= 8,
        hasLowercase: /[a-z]/.test(password),
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
      });
    }
  }, [password, isRegistering]);

  // Load data from storage when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadFromStorage();
    }
  }, [isAuthenticated, currentUser]);

  // Initialize localNotes when editing modal opens
  useEffect(() => {
    if (editingImage) {
      const cat = categories.find(c => c.id === editingImage.categoryId);
      const img = cat?.images[editingImage.imageIndex];
      setLocalNotes(img?.notes || '');
      setTagInput('');
    }
  }, [editingImage, categories]);

  // Save to storage whenever categories change
  useEffect(() => {
    if (!isLoading && categories.length > 0 && isAuthenticated && currentUser) {
      saveToStorage();
    }
  }, [categories, isLoading, isAuthenticated, currentUser]);

  const checkAuth = async () => {
    try {
      const result = await window.storage.get('current-session');
      if (result && result.value) {
        const session = JSON.parse(result.value);
        setCurrentUser(session.email);
        setIsAuthenticated(true);
        setShowLogin(false);
      }
    } catch (error) {
      console.log('No active session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    if (isRegistering && (!firstName || !lastName)) {
      alert('Please enter your first and last name');
      return;
    }

    // Password validation for registration
    if (isRegistering) {
      const passwordErrors = [];
      if (password.length < 8) passwordErrors.push('at least 8 characters');
      if (!/[a-z]/.test(password)) passwordErrors.push('a lowercase letter');
      if (!/[A-Z]/.test(password)) passwordErrors.push('an uppercase letter');
      if (!/[0-9]/.test(password)) passwordErrors.push('a number');
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) passwordErrors.push('a symbol');

      if (passwordErrors.length > 0) {
        alert(`Password must contain:\n• ${passwordErrors.join('\n• ')}`);
        return;
      }
    }

    const userKey = `user:${email}`;

    if (isRegistering) {
      // Registration logic
      try {
        // Check if user already exists
        const existingUser = await window.storage.get(userKey);
        if (existingUser) {
          alert('An account with this email already exists. Please login or use a different email.');
          return;
        }

        // Validate all password requirements are met
        if (!passwordRequirements.minLength || !passwordRequirements.hasLowercase || 
            !passwordRequirements.hasUppercase || !passwordRequirements.hasNumber || 
            !passwordRequirements.hasSymbol) {
          alert('Please meet all password requirements before registering.');
          return;
        }

        // In production, you would:
        // 1. Hash the password (use bcrypt or similar)
        // 2. Send to your backend API
        // 3. Store in SQL database with: email, first_name, last_name, hashed_password, created_at, etc.
        
        // For demo purposes, storing locally (NOT SECURE - replace with backend)
        const userData = {
          email: email,
          firstName: firstName,
          lastName: lastName,
          password: password, // In production: hash this!
          createdAt: new Date().toISOString()
        };

        await window.storage.set(userKey, JSON.stringify(userData));
        
        // Create session
        await window.storage.set('current-session', JSON.stringify({ email, firstName, lastName }));
        
        setCurrentUser(email);
        setIsAuthenticated(true);
        setShowLogin(false);
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        
      } catch (error) {
        alert('Registration failed. Please try again.');
        console.error(error);
      }
    } else {
      // Login logic
      try {
        const result = await window.storage.get(userKey);
        
        if (!result) {
          alert('User not found. Please register first.');
          return;
        }

        const userData = JSON.parse(result.value);
        
        // In production, you would:
        // 1. Send email/password to your backend API
        // 2. Backend verifies hashed password
        // 3. Backend returns JWT token or session ID
        // 4. Store token/session locally
        
        if (userData.password !== password) {
          alert('Incorrect password');
          return;
        }

        // Create session
        await window.storage.set('current-session', JSON.stringify({ 
          email, 
          firstName: userData.firstName, 
          lastName: userData.lastName 
        }));
        
        setCurrentUser(email);
        setIsAuthenticated(true);
        setShowLogin(false);
        setEmail('');
        setPassword('');
        
      } catch (error) {
        alert('Login failed. Please try again.');
        console.error(error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await window.storage.delete('current-session');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setShowLogin(true);
      setCategories([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const skipRegistration = async () => {
    // Create a temporary guest session
    const guestEmail = 'guest@posevault.local';
    await window.storage.set('current-session', JSON.stringify({ 
      email: guestEmail, 
      firstName: 'Guest', 
      lastName: 'User' 
    }));
    setCurrentUser(guestEmail);
    setIsAuthenticated(true);
    setShowLogin(false);
    setShowGuestModal(false);
  };

  const loadFromStorage = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const result = await window.storage.get(`categories:${currentUser}`);
      if (result && result.value) {
        const savedCategories = JSON.parse(result.value);
        // Migration: Add dateAdded, tags, and notes to existing images that don't have them
        const migratedCategories = savedCategories.map(cat => ({
          ...cat,
          images: cat.images.map(img => ({
            ...img,
            dateAdded: img.dateAdded || new Date().toISOString(),
            tags: img.tags || [],
            notes: img.notes || ''
          }))
        }));
        setCategories(migratedCategories);
      } else {
        initializeDefaultCategories();
      }
    } catch (error) {
      console.log('No saved data found, initializing defaults');
      initializeDefaultCategories();
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultCategories = () => {
    setCategories([
      { id: 1, name: "Men's Poses", cover: null, images: [], isFavorite: false },
      { id: 2, name: "Women's Poses", cover: null, images: [], isFavorite: false },
      { id: 3, name: "Couples Poses", cover: null, images: [], isFavorite: false },
      { id: 4, name: "Couples & Pet Poses", cover: null, images: [], isFavorite: false },
      { id: 5, name: "Family Poses", cover: null, images: [], isFavorite: false },
      { id: 6, name: "Siblings Poses", cover: null, images: [], isFavorite: false },
      { id: 7, name: "Engagement Poses", cover: null, images: [], isFavorite: false },
      { id: 8, name: "Maternity Poses", cover: null, images: [], isFavorite: false },
      { id: 9, name: "Newborn Poses", cover: null, images: [], isFavorite: false },
      { id: 10, name: "Boudoir Poses", cover: null, images: [], isFavorite: false }
    ]);
  };

  const saveToStorage = async () => {
    if (!currentUser) return;
    
    try {
      await window.storage.set(`categories:${currentUser}`, JSON.stringify(categories));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const addNewCategory = () => {
    if (newCategoryName.trim()) {
      const newId = Math.max(...categories.map(c => c.id), 0) + 1;
      setCategories([...categories, {
        id: newId,
        name: newCategoryName.trim(),
        cover: null,
        images: [],
        isFavorite: false
      }]);
      setNewCategoryName('');
      setShowNewCategoryModal(false);
    }
  };

  const toggleCategoryFavorite = (categoryId) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId ? { ...cat, isFavorite: !cat.isFavorite } : cat
    ));
  };

  const renameCategory = (categoryId) => {
    if (editCategoryName.trim()) {
      setCategories(categories.map(cat =>
        cat.id === categoryId ? { ...cat, name: editCategoryName.trim() } : cat
      ));
      setEditingCategory(null);
      setEditCategoryName('');
    }
  };

  const deleteCategory = (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category and all its images?')) {
      setCategories(categories.filter(cat => cat.id !== categoryId));
    }
  };

  const handleCoverUpload = (e, categoryId) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCategories(categories.map(cat =>
          cat.id === categoryId ? { ...cat, cover: event.target.result } : cat
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImagesUpload = (e, categoryId) => {
    const files = Array.from(e.target.files);
    const readers = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve({ 
          src: event.target.result, 
          isFavorite: false,
          tags: [],
          notes: '',
          dateAdded: new Date().toISOString()
        });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(images => {
      setCategories(categories.map(cat =>
        cat.id === categoryId ? { ...cat, images: [...cat.images, ...images] } : cat
      ));
    });
  };

  const toggleFavorite = (categoryId, imageIndex) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            images: cat.images.map((img, idx) =>
              idx === imageIndex ? { ...img, isFavorite: !img.isFavorite } : img
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
    const category = categories.find(c => c.id === categoryId);
    if (category && currentImageIndex >= category.images.length - 1) {
      setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
    }
  };

  const updateImageTags = (categoryId, imageIndex, tags) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            images: cat.images.map((img, idx) =>
              idx === imageIndex ? { ...img, tags } : img
            )
          }
        : cat
    ));
  };

  const updateImageNotes = (categoryId, imageIndex, notes) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            images: cat.images.map((img, idx) =>
              idx === imageIndex ? { ...img, notes } : img
            )
          }
        : cat
    ));
  };

  const bulkUpdateTags = (categoryId, imageIndices, newTags, mode) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            images: cat.images.map((img, idx) => {
              if (imageIndices.includes(idx)) {
                if (mode === 'add') {
                  const existingTags = img.tags || [];
                  const combined = [...new Set([...existingTags, ...newTags])];
                  return { ...img, tags: combined };
                } else if (mode === 'replace') {
                  return { ...img, tags: newTags };
                }
              }
              return img;
            })
          }
        : cat
    ));
  };

  const bulkUpdateNotes = (categoryId, imageIndices, notes, mode) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            images: cat.images.map((img, idx) => {
              if (imageIndices.includes(idx)) {
                if (mode === 'append') {
                  return { ...img, notes: img.notes ? `${img.notes}\n${notes}` : notes };
                } else if (mode === 'replace') {
                  return { ...img, notes };
                }
              }
              return img;
            })
          }
        : cat
    ));
  };

  const bulkToggleFavorites = (categoryId, imageIndices, favorite) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            images: cat.images.map((img, idx) =>
              imageIndices.includes(idx) ? { ...img, isFavorite: favorite } : img
            )
          }
        : cat
    ));
  };

  const getAllTags = () => {
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

  const getCategoryTags = (categoryId) => {
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

  const openCategory = (category) => {
    setCurrentCategory(category);
    setViewMode('grid');
    setCurrentImageIndex(0);
    setShowFavoritesOnly(false);
    setSelectedTagFilters([]);
    setTagFilterMode('include');
  };

  const openImage = (index) => {
    setCurrentImageIndex(index);
    setViewMode('single');
  };

  const nextImage = () => {
    const category = categories.find(c => c.id === currentCategory.id);
    if (category && currentImageIndex < category.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const category = currentCategory ? categories.find(c => c.id === currentCategory.id) : null;

  // Get sorted and filtered categories
  const getDisplayedCategories = () => {
    // Sort: favorites first, then others
    const sorted = [...categories].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    // Filter if showing favorites only
    return showFavoriteCategoriesOnly ? sorted.filter(cat => cat.isFavorite) : sorted;
  };

  const displayedCategories = getDisplayedCategories();

  const getDisplayedImages = () => {
    if (!category) return [];
    
    let sorted = [...category.images];
    
    // Filter by tags if any are selected
    if (selectedTagFilters.length > 0) {
      if (tagFilterMode === 'include') {
        // Show images that have ALL selected tags
        sorted = sorted.filter(img => 
          img.tags && selectedTagFilters.every(tag => img.tags.includes(tag))
        );
      } else {
        // Show images that DON'T have ANY of the selected tags
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

  const displayedImages = getDisplayedImages();

  const gridColsClass = {
    2: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    3: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    4: 'grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
  }[gridColumns] || 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  const categoryGridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  }[categoryGridColumns] || 'grid-cols-3';

  // Check if registration button should be disabled
  const isRegisterDisabled = isRegistering && (
    !firstName || 
    !lastName || 
    !email || 
    !password || 
    !confirmPassword ||
    password !== confirmPassword ||
    !passwordRequirements.minLength ||
    !passwordRequirements.hasLowercase ||
    !passwordRequirements.hasUppercase ||
    !passwordRequirements.hasNumber ||
    !passwordRequirements.hasSymbol
  );

  // Login/Register Screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-2 text-center">PoseVault</h1>
          <p className="text-gray-400 text-center mb-6">
            {isRegistering ? 'Create your account' : 'Sign in to continue'}
          </p>
          
          <div className="space-y-4">
            {isRegistering && (
              <>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isRegistering && handleAuth()}
                placeholder="Password"
                className="w-full bg-gray-700 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {isRegistering && (
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  placeholder="Confirm Password"
                  className="w-full bg-gray-700 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}
            
            {isRegistering && confirmPassword && (
              <div className={`text-xs flex items-center gap-2 -mt-2 ${
                password === confirmPassword ? 'text-green-400' : 'text-red-400'
              }`}>
                <span className="w-4">{password === confirmPassword ? '✓' : '✗'}</span>
                <span>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
              </div>
            )}
            
            {isRegistering && password && (
              <div className="space-y-2 -mt-2">
                {/* Character count bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={password.length >= 8 ? 'text-green-400' : 'text-gray-400'}>
                      Character Count
                    </span>
                    <span className={password.length >= 8 ? 'text-green-400' : 'text-gray-400'}>
                      {password.length}/8
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        password.length >= 8 ? 'bg-green-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min((password.length / 8) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Requirements checklist */}
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-2 ${passwordRequirements.hasLowercase ? 'text-green-400' : 'text-gray-400'}`}>
                    <span className="w-4">{passwordRequirements.hasLowercase ? '✓' : '○'}</span>
                    <span>Lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRequirements.hasUppercase ? 'text-green-400' : 'text-gray-400'}`}>
                    <span className="w-4">{passwordRequirements.hasUppercase ? '✓' : '○'}</span>
                    <span>Uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
                    <span className="w-4">{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRequirements.hasSymbol ? 'text-green-400' : 'text-gray-400'}`}>
                    <span className="w-4">{passwordRequirements.hasSymbol ? '✓' : '○'}</span>
                    <span>Symbol (!@#$%...)</span>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleAuth}
              disabled={isRegisterDisabled}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
                isRegisterDisabled
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isRegistering ? 'Register' : 'Login'}
            </button>
            
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full text-gray-400 hover:text-white transition-colors text-sm"
            >
              {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
            </button>

            <button
              onClick={() => setShowGuestModal(true)}
              className="w-full bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-semibold transition-colors mt-2"
            >
              ⚡ Continue as Guest
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Powered by{' '}
              <a 
                href="http://www.dockercapphotography.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors underline"
              >
                Docker Cap Photography
              </a>
            </p>
          </div>
          
          {isRegistering && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg text-xs text-gray-300">
              <p className="font-semibold mb-2">⚠️ Production Integration Notes:</p>
              <p className="mb-1">This demo stores credentials locally. For production:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Hash passwords with bcrypt</li>
                <li>Send auth requests to your backend API</li>
                <li>Store in SQL: users table with email, first_name, last_name, hashed_password, created_at</li>
                <li>Return JWT tokens for session management</li>
                <li>Store user data with user_id foreign key</li>
              </ul>
            </div>
          )}
        </div>

        {/* Guest Mode Warning Modal */}
        {showGuestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-yellow-400">⚠️ Guest Mode Warning</h2>
                <button
                  onClick={() => setShowGuestModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="mb-6 space-y-3 text-gray-300">
                <p>
                  Without an account, your data will be saved under a <strong>shared guest account</strong>.
                </p>
                <p className="text-yellow-300">
                  <strong>This means:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Anyone using guest mode on this device will see your categories and images</li>
                  <li>Others can modify or delete your content</li>
                  <li>Your data is not private or secure</li>
                </ul>
                <p className="pt-2 text-purple-300">
                  For private storage, please create an account.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGuestModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors font-semibold"
                >
                  Go Back
                </button>
                <button
                  onClick={skipRegistration}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg transition-colors font-semibold"
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your pose library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {viewMode !== 'categories' && (
              <button
                onClick={() => {
                  if (viewMode === 'single') {
                    setViewMode('grid');
                  } else {
                    setViewMode('categories');
                    setCurrentCategory(null);
                  }
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="text-2xl font-bold">
              {viewMode === 'categories' ? 'PoseVault' : category?.name || 'Category'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {viewMode === 'categories' && (
              <button
                onClick={() => setShowNewCategoryModal(true)}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={20} />
                Add Category
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Categories View */}
      {viewMode === 'categories' && (
        <div className="p-6 max-w-6xl mx-auto">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowFavoriteCategoriesOnly(!showFavoriteCategoriesOnly)}
              className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                showFavoriteCategoriesOnly
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Heart size={20} className={showFavoriteCategoriesOnly ? 'fill-white' : ''} />
              {showFavoriteCategoriesOnly ? 'Show All Categories' : 'Favorite Categories Only'}
            </button>

            <div className="relative ml-auto" ref={categoryDropdownRef}>
              <button
                onClick={() => setShowCategoryGridDropdown(!showCategoryGridDropdown)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 inline-flex items-center gap-2 transition-colors"
              >
                <Grid3x3 size={20} />
                <span>{categoryGridColumns} Columns</span>
                <ChevronDown size={16} />
              </button>
              
              {showCategoryGridDropdown && (
                <div className="absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-10">
                  <button
                    onClick={() => {
                      setCategoryGridColumns(2);
                      setShowCategoryGridDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                      categoryGridColumns === 2 ? 'bg-gray-700 text-purple-400' : ''
                    }`}
                  >
                    2 Columns
                  </button>
                  <button
                    onClick={() => {
                      setCategoryGridColumns(3);
                      setShowCategoryGridDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                      categoryGridColumns === 3 ? 'bg-gray-700 text-purple-400' : ''
                    }`}
                  >
                    3 Columns
                  </button>
                  <button
                    onClick={() => {
                      setCategoryGridColumns(4);
                      setShowCategoryGridDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                      categoryGridColumns === 4 ? 'bg-gray-700 text-purple-400' : ''
                    }`}
                  >
                    4 Columns
                  </button>
                </div>
              )}
            </div>
          </div>

          {displayedCategories.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Heart size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No favorite categories yet</p>
              <p className="text-sm mt-2">Click the heart icon on categories to mark them as favorites</p>
            </div>
          ) : (
            <div className={`grid ${categoryGridColsClass} gap-6`}>
              {displayedCategories.map(cat => (
                <div key={cat.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow relative">
                  {cat.cover ? (
                    <>
                      {/* Heart icon in top-right when there's a cover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryFavorite(cat.id);
                        }}
                        className="absolute top-2 right-2 p-2 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all z-10"
                      >
                        <Heart
                          size={20}
                          className={cat.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
                        />
                      </button>

                      <div
                        onClick={() => cat.images.length > 0 && openCategory(cat)}
                        className={`aspect-[4/3] bg-gray-700 relative group ${cat.images.length > 0 ? 'cursor-pointer' : ''}`}
                      >
                        <img
                          src={cat.cover}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                        {cat.images.length > 0 && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-700 py-6 flex items-center justify-center gap-3">
                      <Camera size={24} className="text-gray-400" />
                      <span className="text-gray-400 font-medium">No Cover Photo</span>
                    </div>
                  )}

                  <div className="p-4">
                    {editingCategory === cat.id ? (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && renameCategory(cat.id)}
                          onBlur={() => renameCategory(cat.id)}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-2">
                        <h3 
                          className="font-bold text-lg cursor-pointer hover:text-purple-400 transition-colors"
                          onClick={() => {
                            setEditingCategory(cat.id);
                            setEditCategoryName(cat.name);
                          }}
                          title="Click to rename"
                        >
                          {cat.name}
                        </h3>
                        {!cat.cover && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategoryFavorite(cat.id);
                            }}
                            className="p-1 hover:bg-gray-700 rounded-full transition-all"
                          >
                            <Heart
                              size={20}
                              className={cat.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-white'}
                            />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-gray-400 mb-3">
                      {cat.images.length} poses • {cat.images.filter(img => img.isFavorite).length} favorites
                    </p>
                    
                    <div className="space-y-2">
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleImagesUpload(e, cat.id)}
                          className="hidden"
                        />
                        <div 
                          className="text-center py-2 rounded-lg text-sm flex items-center justify-center gap-2 text-white"
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
                          <Images size={16} />
                          <span>Add Pose Images</span>
                        </div>
                      </label>

                      {/* Settings Button in Bottom Right */}
                      <div className="relative">
                        <button
                          onClick={() => setShowCategorySettings(showCategorySettings === cat.id ? null : cat.id)}
                          className="absolute bottom-0 right-0 p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                        >
                          <Settings size={20} className="text-gray-300" />
                        </button>

                        {/* Settings Dropdown */}
                        {showCategorySettings === cat.id && (
                          <div className="absolute bottom-12 right-0 bg-gray-700 rounded-lg shadow-xl border border-gray-600 overflow-hidden z-10 min-w-[180px]">
                            <label className="block cursor-pointer hover:bg-gray-600 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  handleCoverUpload(e, cat.id);
                                  setShowCategorySettings(null);
                                }}
                                className="hidden"
                              />
                              <div className="px-4 py-2 text-sm flex items-center gap-2">
                                <Camera size={16} />
                                <span>{cat.cover ? 'Change Cover' : 'Upload Cover'}</span>
                              </div>
                            </label>
                            <button
                              onClick={() => {
                                deleteCategory(cat.id);
                                setShowCategorySettings(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2 text-red-400"
                            >
                              <Trash2 size={16} />
                              <span>Delete Category</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && category && (
        <div className="p-6 max-w-6xl mx-auto">
          {category.images.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Upload size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No poses in this category yet</p>
              <label className="inline-block mt-4 cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImagesUpload(e, category.id)}
                  className="hidden"
                />
                <div 
                  className="px-6 py-3 rounded-lg inline-flex items-center gap-2 text-white"
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
                </div>
              </label>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImagesUpload(e, category.id)}
                    className="hidden"
                  />
                  <div 
                    className="px-4 py-2 rounded-lg inline-flex items-center gap-2 text-white"
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
                    <Upload size={20} />
                    <span>Add More Poses</span>
                  </div>
                </label>

                <select
                  value={showFavoritesOnly ? 'favoritesOnly' : sortBy}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'favoritesOnly') {
                      setSortBy('favorites');
                      setShowFavoritesOnly(true);
                    } else {
                      setSortBy(value);
                      setShowFavoritesOnly(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="dateAdded">Newest First</option>
                  <option value="dateAddedOldest">Oldest First</option>
                  <option value="favorites">Favorites First</option>
                  <option value="favoritesOnly">Favorites Only</option>
                </select>

                {/* Tag Filter Button */}
                {(() => {
                  const categoryTags = getCategoryTags(category.id);
                  if (categoryTags.length > 0) {
                    return (
                      <button
                        onClick={() => setShowTagFilterModal(true)}
                        className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                          selectedTagFilters.length > 0
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <Filter size={20} />
                        <span>
                          {selectedTagFilters.length > 0 
                            ? `${selectedTagFilters.length} Tag${selectedTagFilters.length > 1 ? 's' : ''}`
                            : 'Filter by Tags'}
                        </span>
                      </button>
                    );
                  }
                  return null;
                })()}

                {/* Bulk Select Button */}
                <button
                  onClick={() => {
                    setBulkSelectMode(!bulkSelectMode);
                    setSelectedImages([]);
                  }}
                  className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                    bulkSelectMode
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <CheckSquare size={20} />
                  <span>{bulkSelectMode ? 'Cancel' : 'Bulk Select'}</span>
                </button>

                {/* Bulk Edit Button (shown when images selected) */}
                {bulkSelectMode && selectedImages.length > 0 && (
                  <button
                    onClick={() => setShowBulkEditModal(true)}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 inline-flex items-center gap-2 transition-colors"
                  >
                    <FileText size={20} />
                    <span>Edit {selectedImages.length} Image{selectedImages.length > 1 ? 's' : ''}</span>
                  </button>
                )}

                <div className="relative ml-auto" ref={dropdownRef}>
                  <button
                    onClick={() => setShowGridDropdown(!showGridDropdown)}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 inline-flex items-center gap-2 transition-colors"
                  >
                    <Grid3x3 size={20} />
                    <span>{gridColumns} Columns</span>
                    <ChevronDown size={16} />
                  </button>
                  
                  {showGridDropdown && (
                    <div className="absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-10">
                      <button
                        onClick={() => {
                          setGridColumns(2);
                          setShowGridDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                          gridColumns === 2 ? 'bg-gray-700 text-purple-400' : ''
                        }`}
                      >
                        2 Columns
                      </button>
                      <button
                        onClick={() => {
                          setGridColumns(3);
                          setShowGridDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                          gridColumns === 3 ? 'bg-gray-700 text-purple-400' : ''
                        }`}
                      >
                        3 Columns
                      </button>
                      <button
                        onClick={() => {
                          setGridColumns(4);
                          setShowGridDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                          gridColumns === 4 ? 'bg-gray-700 text-purple-400' : ''
                        }`}
                      >
                        4 Columns
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {displayedImages.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Heart size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No favorite poses yet</p>
                  <p className="text-sm mt-2">Click the heart icon on images to mark them as favorites</p>
                </div>
              ) : (
                <div className={`grid ${gridColsClass} gap-4`}>
                  {displayedImages.map((img, idx) => {
                    const originalIndex = category.images.indexOf(img);
                    const isSelected = selectedImages.includes(originalIndex);
                    return (
                      <div key={originalIndex} className="relative group aspect-[3/4]">
                        <img
                          src={img.src}
                          alt={`Pose ${originalIndex + 1}`}
                          onClick={() => {
                            if (bulkSelectMode) {
                              // Toggle selection in bulk mode
                              if (isSelected) {
                                setSelectedImages(selectedImages.filter(i => i !== originalIndex));
                              } else {
                                setSelectedImages([...selectedImages, originalIndex]);
                              }
                            } else {
                              // Normal mode - open image
                              openImage(originalIndex);
                            }
                          }}
                          className={`w-full h-full object-cover rounded-lg cursor-pointer transition-all ${
                            bulkSelectMode
                              ? isSelected
                                ? 'ring-4 ring-green-500 opacity-90'
                                : 'hover:ring-4 hover:ring-gray-500 hover:opacity-90'
                              : 'hover:opacity-90'
                          }`}
                        />
                        
                        {/* Bulk Select Checkbox */}
                        {bulkSelectMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-green-600'
                                : 'bg-gray-800 bg-opacity-75'
                            }`}>
                              {isSelected && <CheckSquare size={20} className="text-white" />}
                            </div>
                          </div>
                        )}
                        
                        {/* Tags overlay at bottom */}
                        {img.tags && img.tags.length > 0 && !bulkSelectMode && (
                          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                            {img.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="bg-purple-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                            {img.tags.length > 3 && (
                              <span className="bg-gray-800 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
                                +{img.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Normal mode buttons */}
                        {!bulkSelectMode && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(category.id, originalIndex);
                              }}
                              className="absolute top-2 left-2 p-2 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all"
                            >
                              <Heart
                                size={20}
                                className={img.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingImage({ categoryId: category.id, imageIndex: originalIndex });
                              }}
                              className="absolute top-2 right-12 bg-blue-600 hover:bg-blue-700 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => deleteImage(category.id, originalIndex)}
                              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Single Image View */}
      {viewMode === 'single' && category && category.images.length > 0 && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="h-full flex flex-col">
            {/* Close button */}
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => setViewMode('grid')}
                className="bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-3 rounded-full transition-all"
              >
                <X size={28} />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center relative p-4">
              <img
                src={category.images[currentImageIndex].src}
                alt={`Pose ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(category.id, currentImageIndex);
                }}
                className="absolute top-4 right-4 p-3 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all"
              >
                <Heart
                  size={28}
                  className={category.images[currentImageIndex].isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
                />
              </button>

              {currentImageIndex > 0 && (
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-4 rounded-full transition-all"
                >
                  <ChevronLeft size={32} />
                </button>
              )}
              
              {currentImageIndex < category.images.length - 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-4 rounded-full transition-all"
                >
                  <ChevronRight size={32} />
                </button>
              )}
            </div>
            
            <div className="bg-gray-800 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-300 text-lg">
                    Pose {currentImageIndex + 1} of {category.images.length}
                    {category.images[currentImageIndex].isFavorite && (
                      <span className="ml-2 text-red-500">★ Favorite</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Calendar size={16} />
                    <span>
                      {category.images[currentImageIndex].dateAdded
                        ? `Added ${new Date(category.images[currentImageIndex].dateAdded).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}`
                        : 'Date not available'}
                    </span>
                  </div>
                </div>
                
                {/* Tags */}
                {category.images[currentImageIndex].tags && category.images[currentImageIndex].tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {category.images[currentImageIndex].tags.map((tag, i) => (
                      <span key={i} className="bg-purple-600 text-white text-sm px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Notes */}
                {category.images[currentImageIndex].notes && (
                  <div className="mt-2 bg-gray-700 rounded-lg p-3">
                    <p className="text-gray-300 text-sm">{category.images[currentImageIndex].notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add New Category</h2>
              <button
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setNewCategoryName('');
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
              placeholder="Category name..."
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-600"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setNewCategoryName('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addNewCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Editing Modal */}
      {editingImage && (() => {
        const cat = categories.find(c => c.id === editingImage.categoryId);
        const img = cat?.images[editingImage.imageIndex];
        
        // Get filtered tag suggestions based on input
        const getTagSuggestions = () => {
          if (!tagInput.trim()) return [];
          const allTags = getAllTags();
          const unusedTags = allTags.filter(tag => !img?.tags?.includes(tag));
          return unusedTags.filter(tag => 
            tag.toLowerCase().includes(tagInput.toLowerCase())
          ).slice(0, 5); // Limit to 5 suggestions
        };
        
        const suggestions = getTagSuggestions();
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Edit Pose Details</h2>
                <button
                  onClick={() => {
                    setEditingImage(null);
                    setTagInput('');
                    setLocalNotes('');
                  }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Image Preview */}
              <div className="mb-6">
                <img
                  src={img?.src}
                  alt="Pose preview"
                  className="w-full h-64 object-contain bg-gray-900 rounded-lg"
                />
              </div>

              {/* Date Added */}
              <div className="mb-6 flex items-center gap-2 text-gray-400 text-sm">
                <Calendar size={16} />
                <span>
                  {img?.dateAdded
                    ? `Added ${new Date(img.dateAdded).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}`
                    : 'Date not available'}
                </span>
              </div>

              {/* Tags Section */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Tag size={16} />
                  Tags
                </label>
                <div className="relative">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          const newTags = [...(img.tags || []), tagInput.trim()];
                          updateImageTags(editingImage.categoryId, editingImage.imageIndex, newTags);
                          setTagInput('');
                        }
                      }}
                      placeholder="Add a tag (press Enter)"
                      className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      onClick={() => {
                        if (tagInput.trim()) {
                          const newTags = [...(img.tags || []), tagInput.trim()];
                          updateImageTags(editingImage.categoryId, editingImage.imageIndex, newTags);
                          setTagInput('');
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  {/* Autocomplete Suggestions Dropdown */}
                  {tagInput && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-gray-700 rounded-lg shadow-xl border border-gray-600 max-h-48 overflow-y-auto mb-2">
                      {suggestions.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const newTags = [...(img.tags || []), tag];
                            updateImageTags(editingImage.categoryId, editingImage.imageIndex, newTags);
                            setTagInput('');
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-600 transition-colors flex items-center gap-2"
                        >
                          <Tag size={14} className="text-purple-400" />
                          <span>{tag}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Existing Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {img?.tags && img.tags.length > 0 ? (
                    img.tags.map((tag, i) => (
                      <span key={i} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        {tag}
                        <button
                          onClick={() => {
                            const newTags = img.tags.filter((_, idx) => idx !== i);
                            updateImageTags(editingImage.categoryId, editingImage.imageIndex, newTags);
                          }}
                          className="hover:bg-purple-700 rounded-full p-0.5"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No tags yet. Add some above!</p>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <FileText size={16} />
                  Notes
                </label>
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Add notes about this pose (e.g., lighting, location, client preferences)"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[100px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingImage(null);
                    setTagInput('');
                    setLocalNotes('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateImageNotes(editingImage.categoryId, editingImage.imageIndex, localNotes);
                    setEditingImage(null);
                    setTagInput('');
                    setLocalNotes('');
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tag Filter Modal */}
      {showTagFilterModal && category && (() => {
        const categoryTags = getCategoryTags(category.id);
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Filter by Tags</h2>
                <button
                  onClick={() => setShowTagFilterModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Include/Exclude Toggle */}
              <div className="mb-4">
                <label className="text-sm font-semibold mb-2 block">Filter Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTagFilterMode('include')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      tagFilterMode === 'include'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Has These Tags
                  </button>
                  <button
                    onClick={() => setTagFilterMode('exclude')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      tagFilterMode === 'exclude'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Doesn't Have These
                  </button>
                </div>
              </div>

              {/* Tag Selection */}
              <div className="mb-6">
                <label className="text-sm font-semibold mb-2 block">Select Tags</label>
                <div className="flex flex-wrap gap-2">
                  {categoryTags.map((tag, i) => {
                    const isSelected = selectedTagFilters.includes(tag);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTagFilters(selectedTagFilters.filter(t => t !== tag));
                          } else {
                            setSelectedTagFilters([...selectedTagFilters, tag]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        {tag}
                        {isSelected && <span className="ml-1">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedTagFilters([]);
                    setShowTagFilterModal(false);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setShowTagFilterModal(false)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && category && selectedImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Bulk Edit {selectedImages.length} Image{selectedImages.length > 1 ? 's' : ''}</h2>
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setBulkTagInput('');
                  setBulkTagsToAdd([]);
                  setBulkNotes('');
                  setBulkNotesMode('append');
                  setBulkFavoriteAction('noChange');
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Add Tags Section */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Tag size={16} />
                Add Tags to Selected Images
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && bulkTagInput.trim()) {
                      setBulkTagsToAdd([...bulkTagsToAdd, bulkTagInput.trim()]);
                      setBulkTagInput('');
                    }
                  }}
                  placeholder="Add a tag (press Enter)"
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  onClick={() => {
                    if (bulkTagInput.trim()) {
                      setBulkTagsToAdd([...bulkTagsToAdd, bulkTagInput.trim()]);
                      setBulkTagInput('');
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {bulkTagsToAdd.map((tag, i) => (
                  <span key={i} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {tag}
                    <button
                      onClick={() => setBulkTagsToAdd(bulkTagsToAdd.filter((_, idx) => idx !== i))}
                      className="hover:bg-purple-700 rounded-full p-0.5"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {bulkTagsToAdd.length === 0 && (
                  <p className="text-gray-400 text-sm">No tags to add yet</p>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                <FileText size={16} />
                Update Notes
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setBulkNotesMode('append')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    bulkNotesMode === 'append'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Append Notes
                </button>
                <button
                  onClick={() => setBulkNotesMode('replace')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    bulkNotesMode === 'replace'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Replace Notes
                </button>
              </div>
              <textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder={bulkNotesMode === 'append' ? 'Text to append to existing notes' : 'New notes to replace existing'}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[100px]"
              />
            </div>

            {/* Favorites Section */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Heart size={16} />
                Favorite Status
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkFavoriteAction('noChange')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    bulkFavoriteAction === 'noChange'
                      ? 'bg-gray-600 hover:bg-gray-500'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  No Change
                </button>
                <button
                  onClick={() => setBulkFavoriteAction('favorite')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    bulkFavoriteAction === 'favorite'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Mark as Favorite
                </button>
                <button
                  onClick={() => setBulkFavoriteAction('unfavorite')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    bulkFavoriteAction === 'unfavorite'
                      ? 'bg-gray-600 hover:bg-gray-500'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Remove Favorite
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setBulkTagInput('');
                  setBulkTagsToAdd([]);
                  setBulkNotes('');
                  setBulkNotesMode('append');
                  setBulkFavoriteAction('noChange');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Apply tags
                  if (bulkTagsToAdd.length > 0) {
                    bulkUpdateTags(category.id, selectedImages, bulkTagsToAdd, 'add');
                  }
                  
                  // Apply notes
                  if (bulkNotes.trim()) {
                    bulkUpdateNotes(category.id, selectedImages, bulkNotes, bulkNotesMode);
                  }
                  
                  // Apply favorites
                  if (bulkFavoriteAction === 'favorite') {
                    bulkToggleFavorites(category.id, selectedImages, true);
                  } else if (bulkFavoriteAction === 'unfavorite') {
                    bulkToggleFavorites(category.id, selectedImages, false);
                  }
                  
                  // Close modal and reset
                  setShowBulkEditModal(false);
                  setBulkSelectMode(false);
                  setSelectedImages([]);
                  setBulkTagInput('');
                  setBulkTagsToAdd([]);
                  setBulkNotes('');
                  setBulkNotesMode('append');
                  setBulkFavoriteAction('noChange');
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}