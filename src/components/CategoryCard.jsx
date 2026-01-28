import React, { useState, useRef, useEffect } from 'react';
import { Heart, Camera, Images, Settings } from 'lucide-react';
import CategorySettingsDropdown from './Modals/CategorySettingsDropdown';

export default function CategoryCard({ 
  category, 
  onOpen, 
  onToggleFavorite, 
  onUploadImages,
  onEditSettings,
  onUploadCover,
  onDelete,
  onGeneratePDF
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownAlignRight, setDropdownAlignRight] = useState(false);
  const [dropdownAlignTop, setDropdownAlignTop] = useState(false);
  const dropdownRef = useRef(null);
  const settingsButtonRef = useRef(null);

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
    <div className="bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow relative">
      {category.cover ? (
        <>
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

          <div
            onClick={() => category.images.length > 0 && onOpen(category)}
            className={`aspect-[4/3] bg-gray-700 relative group ${category.images.length > 0 ? 'cursor-pointer' : ''}`}
          >
            <img
              src={category.cover}
              alt={category.name}
              className="w-full h-full object-cover rounded-t-xl"
            />
            {category.images.length > 0 && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
            )}
          </div>
        </>
      ) : (
        <div
          onClick={() => category.images.length > 0 && onOpen(category)}
          className={`bg-gray-700 py-6 md:py-8 flex items-center justify-center gap-2 md:gap-3 aspect-[4/3] rounded-t-xl ${category.images.length > 0 ? 'cursor-pointer hover:bg-gray-600' : ''} transition-colors`}
        >
          <Camera size={20} className="text-gray-400 md:w-6 md:h-6" />
          <span className="text-gray-400 font-medium text-sm md:text-base">No Cover Photo</span>
        </div>
      )}

      <div className="p-3 md:p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm md:text-lg truncate pr-2">
            {category.name}
          </h3>
          {!category.cover && (
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
          {category.images.length} poses • {category.images.filter(img => img.isFavorite).length} favorites
        </p>
        
        <div className="space-y-2 relative pb-10 md:pb-12">
          <label className="block cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif"
              onChange={(e) => onUploadImages(e, category.id)}
              className="hidden"
              id={`upload-${category.id}`}
            />
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const input = document.getElementById(`upload-${category.id}`);
                if (input) input.click();
              }}
              className="text-center py-1.5 md:py-2 rounded-lg text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 text-white cursor-pointer"
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
              <Images size={14} className="md:w-4 md:h-4" />
              <span>Add Pose Images</span>
            </div>
          </label>

          {/* Settings button with dropdown */}
          <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2">
            <div ref={dropdownRef}>
              <button
                ref={settingsButtonRef}
                onClick={handleSettingsClick}
                className="p-1.5 md:p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors relative z-10 cursor-pointer"
              >
                <Settings size={16} className="text-gray-300 md:w-5 md:h-5" />
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
                    onUploadCover={(e, catId) => {
                      onUploadCover(e, catId);
                    }}
                    onDelete={(catId) => {
                      onDelete(catId);
                    }}
                    onGeneratePDF={() => {
                      onGeneratePDF(category);
                    }}
                    onClose={() => setShowDropdown(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}