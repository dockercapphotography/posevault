import React from 'react';
import { Heart, Trash2, FileText, CheckSquare } from 'lucide-react';

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
            className="absolute top-2 left-2 p-2 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all"
          >
            <Heart
              size={20}
              className={image.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(index);
            }}
            className="absolute top-2 right-12 bg-blue-600 hover:bg-blue-700 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(index);
            }}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={16} />
          </button>
        </>
      )}
    </div>
  );
}
