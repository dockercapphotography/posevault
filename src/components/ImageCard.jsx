import React, { useState, useRef, useEffect } from 'react';
import { Heart, Trash2, FileText, CheckSquare, MoreVertical } from 'lucide-react';

export default function ImageCard({
  image,
  index,
  isSelected,
  bulkSelectMode,
  onImageClick,
  onToggleFavorite,
  onEdit,
  onDelete
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Handle clicks outside to close the menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <div className="relative group aspect-[3/4]">
      <img
        src={image.src}
        alt={`Pose ${index + 1}`}
        onClick={() => onImageClick(index)}
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
      {image.tags && image.tags.length > 0 && !bulkSelectMode && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
          {image.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="bg-purple-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
              {tag}
            </span>
          ))}
          {image.tags.length > 3 && (
            <span className="bg-gray-800 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
              +{image.tags.length - 3}
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
              onToggleFavorite(index);
            }}
            className="absolute top-2 left-2 p-2 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all cursor-pointer"
          >
            <Heart
              size={20}
              className={image.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
            />
          </button>

          {/* Three-dot menu button */}
          <div ref={menuRef} className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all cursor-pointer"
            >
              <MoreVertical size={20} className="text-white" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 bg-gray-700 rounded-lg shadow-xl border border-gray-600 overflow-hidden min-w-[180px] z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(index);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer text-white"
                >
                  <FileText size={16} className="text-blue-400" />
                  <span>Edit Pose Details</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(index);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer text-red-400"
                >
                  <Trash2 size={16} />
                  <span>Delete Pose</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
