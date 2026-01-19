import React, { useState, useRef, useEffect } from 'react';
import { Heart, Trash2, SquarePen, CheckSquare, MoreVertical, Tag } from 'lucide-react';

export default function ImageCard({
  image,
  index,
  isSelected,
  bulkSelectMode,
  onImageClick,
  onToggleFavorite,
  onEdit,
  onDelete,
  onStartBulkSelect
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const menuRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

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

  // Long press handlers for mobile
  const handleTouchStart = (e) => {
    if (bulkSelectMode) return; // Don't trigger if already in bulk select mode

    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      // Prevent context menu
      e.preventDefault();
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onStartBulkSelect(index);
    }, 500); // 500ms long press
  };

  const handleTouchEnd = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // If long press was triggered, prevent the click event
    if (longPressTriggeredRef.current) {
      e.preventDefault();
      longPressTriggeredRef.current = false;
    }
  };

  const handleTouchMove = () => {
    // Cancel long press if user moves finger
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative group aspect-[3/4]">
      <img
        src={image.src}
        alt={`Pose ${index + 1}`}
        onClick={() => onImageClick(index)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
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
      
      {/* Tags overlay at bottom - hidden on mobile */}
      {image.tags && image.tags.length > 0 && !bulkSelectMode && (
        <div className="hidden md:flex absolute bottom-2 left-2 right-2 flex-wrap gap-1">
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
                {image.tags && image.tags.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTagsModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer text-white"
                  >
                    <Tag size={16} className="text-purple-400" />
                    <span>View Tags</span>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(index);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer text-white"
                >
                  <SquarePen size={16} className="text-blue-400" />
                  <span>Edit Pose Details</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
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

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-600 rounded-full">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Delete Pose?</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to permanently delete this pose?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(index);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Delete Pose
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags Modal */}
      {showTagsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowTagsModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-600 rounded-full">
                <Tag size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Tags</h3>
                <p className="text-sm text-gray-400">Pose {index + 1}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {image.tags && image.tags.length > 0 ? (
                image.tags.map((tag, i) => (
                  <span key={i} className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm">
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-gray-400">No tags added yet</p>
              )}
            </div>
            <button
              onClick={() => setShowTagsModal(false)}
              className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
