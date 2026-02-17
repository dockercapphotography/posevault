import React, { useState, useRef, useEffect } from 'react';
import { Heart, Camera, Images, Settings, Check } from 'lucide-react';
import CategorySettingsDropdown from './Modals/CategorySettingsDropdown';
import TruncatedName from './TruncatedName';

export default function CategoryCard({
  category,
  onOpen,
  onToggleFavorite,
  onUploadImages,
  onShowMobileUpload,
  onEditSettings,
  onUploadCover,
  onDelete,
  onGeneratePDF,
  onShare,
  bulkSelectMode = false,
  isSelected = false,
  onSelect,
  onStartBulkSelect
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownAlignRight, setDropdownAlignRight] = useState(false);
  const [dropdownAlignTop, setDropdownAlignTop] = useState(false);
  const dropdownRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const longPressTimerRef = useRef(null);

  // Filter out cover images from gallery counts
  const galleryImages = category.images.filter(img => !img.isCover);
  const hasGalleryImages = galleryImages.length > 0;

  // Detect mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;
  };

  // Long press handler for bulk select mode
  const handleTouchStart = () => {
    if (bulkSelectMode) return;
    longPressTimerRef.current = setTimeout(() => {
      if (onStartBulkSelect) {
        onStartBulkSelect(category.id);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardClick = () => {
    if (bulkSelectMode && onSelect) {
      onSelect(category.id);
    } else if (hasGalleryImages) {
      onOpen(category);
    }
  };

  // Handle upload button click - show modal on mobile, trigger file input on desktop
  const handleUploadClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile() && onShowMobileUpload) {
      onShowMobileUpload(category.id);
    } else {
      fileInputRef.current?.click();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Calculate dropdown position
  const handleSettingsClick = (e) => {
    e.stopPropagation();
    
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceRight = window.innerWidth - rect.right;
      
      // Check if dropdown should align to the right (based on screen position)
      const screenMidpoint = window.innerWidth / 2;
      setDropdownAlignRight(rect.left > screenMidpoint);
      
      // Check if dropdown should appear above the button
      setDropdownAlignTop(spaceBelow < 250);
    }
    setShowDropdown(!showDropdown);
  };

  return (
    <div
      className={`tutorial-gallery-card bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow relative ${
        isSelected ? 'ring-2 ring-green-500' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Selection checkbox indicator */}
      {bulkSelectMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(category.id);
          }}
          className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-20 cursor-pointer transition-colors ${
            isSelected
              ? 'bg-green-600 border-green-600'
              : 'bg-gray-800/75 border-white'
          }`}
        >
          {isSelected && <Check size={14} className="text-white" />}
        </div>
      )}

      {category.cover ? (
        <>
          {!bulkSelectMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(category.id);
              }}
              className="absolute top-2 right-2 p-2 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all z-10 cursor-pointer"
            >
              <Heart
                size={20}
                className={category.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
              />
            </button>
          )}

          <div
            onClick={handleCardClick}
            className={`aspect-[4/3] bg-gray-700 rounded-xl relative group ${hasGalleryImages || bulkSelectMode ? 'cursor-pointer' : ''}`}
          >
            <img
              src={category.cover}
              alt={category.name}
              className="w-full h-full object-cover rounded-t-xl"
              style={{ objectPosition: `center ${category.coverPositionY ?? 50}%` }}
            />
            {(hasGalleryImages || bulkSelectMode) && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
            )}
          </div>
        </>
      ) : (
        <div
          onClick={handleCardClick}
          className={`bg-gray-700 py-6 md:py-8 flex items-center justify-center gap-2 md:gap-3 aspect-[4/3] rounded-t-xl ${hasGalleryImages || bulkSelectMode ? 'cursor-pointer hover:bg-gray-600' : ''} transition-colors`}
        >
          <Camera size={20} className="text-gray-400 md:w-6 md:h-6" />
          <span className="text-gray-400 font-medium text-sm md:text-base">No Cover Photo</span>
        </div>
      )}

      <div className="p-3 md:p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm md:text-lg truncate pr-2">
            <TruncatedName name={category.name} maxLength={30} />
          </h3>
          {!category.cover && !bulkSelectMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(category.id);
              }}
              className="p-1 hover:bg-gray-700 rounded-full transition-all flex-shrink-0 cursor-pointer"
            >
              <Heart
                size={16}
                className={category.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-white md:w-5 md:h-5'}
              />
            </button>
          )}
        </div>
        <p className="text-xs md:text-sm text-gray-400 mb-3">
          {galleryImages.length} poses • {galleryImages.filter(img => img.isFavorite).length} favorites
        </p>
        
        <div className="flex gap-2">
          {/* Add Images Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif"
            onChange={(e) => onUploadImages(e, category.id)}
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Images size={16} />
            <span className="hidden sm:inline">Add Images</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Settings Button - now inline */}
          <div className="relative" ref={dropdownRef}>
            <button
              ref={settingsButtonRef}
              onClick={handleSettingsClick}
              className="tutorial-settings-button h-full px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer flex items-center"
              aria-label="Gallery settings"
            >
              <Settings size={16} className="text-gray-300" />
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className={`absolute ${
                dropdownAlignTop ? 'bottom-full mb-2' : 'mt-2'
              } ${
                dropdownAlignRight ? 'right-0' : 'left-0'
              } min-w-[180px] z-20`}>
                <CategorySettingsDropdown
                  category={category}
                  onEditSettings={(catId) => {
                    onEditSettings(catId);
                  }}
                  onGeneratePDF={() => {
                    onGeneratePDF(category);
                  }}
                  onShare={onShare}
                  onClose={() => setShowDropdown(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}