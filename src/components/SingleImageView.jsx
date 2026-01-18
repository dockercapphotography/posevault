import React from 'react';
import { X, Heart, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function SingleImageView({ 
  image, 
  currentIndex, 
  totalImages, 
  onClose, 
  onToggleFavorite, 
  onPrevious, 
  onNext 
}) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="h-full flex flex-col">
        {/* Close button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={onClose}
            className="bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-3 rounded-full transition-all"
          >
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center relative p-4">
          <img
            src={image.src}
            alt={`Pose ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
          
          <button
            onClick={onToggleFavorite}
            className="absolute top-4 right-4 p-3 rounded-full bg-gray-800 bg-opacity-75 hover:bg-opacity-100 transition-all"
          >
            <Heart
              size={28}
              className={image.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
            />
          </button>

          {currentIndex > 0 && (
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-4 rounded-full transition-all"
            >
              <ChevronLeft size={32} />
            </button>
          )}
          
          {currentIndex < totalImages - 1 && (
            <button
              onClick={onNext}
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
                Pose {currentIndex + 1} of {totalImages}
                {image.isFavorite && (
                  <span className="ml-2 text-red-500">★ Favorite</span>
                )}
              </p>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar size={16} />
                <span>
                  {image.dateAdded
                    ? `Added ${new Date(image.dateAdded).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}`
                    : 'Date not available'}
                </span>
              </div>
            </div>
            
            {/* Tags */}
            {image.tags && image.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {image.tags.map((tag, i) => (
                  <span key={i} className="bg-purple-600 text-white text-sm px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Notes */}
            {image.notes && (
              <div className="mt-2 bg-gray-700 rounded-lg p-3">
                <p className="text-gray-300 text-sm">{image.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
