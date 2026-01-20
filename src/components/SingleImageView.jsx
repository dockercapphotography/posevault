import React, { useState, useRef, useEffect } from 'react';
import { X, Heart, ChevronLeft, ChevronRight, Calendar, StickyNote } from 'lucide-react';

export default function SingleImageView({
  image,
  currentIndex,
  totalImages,
  onClose,
  onToggleFavorite,
  onPrevious,
  onNext
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showNotesModal, setShowNotesModal] = useState(false);
  const imageRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTouchDistanceRef = useRef(null);
  const lastTouchCenterRef = useRef(null);
  const panStartPositionRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);

  if (!image) return null;

  // Reset fullscreen state when image changes
  useEffect(() => {
    setIsFullscreen(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setShowNotesModal(false);
  }, [currentIndex]);

  // Handle swipe gestures for navigation (only when not in fullscreen)
  const handleTouchStart = (e) => {
    if (isFullscreen) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    if (isFullscreen) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Detect swipe (must be horizontal, fast, and significant distance)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && deltaTime < 300) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous image
        onPrevious();
      } else if (deltaX < 0 && currentIndex < totalImages - 1) {
        // Swipe left - go to next image
        onNext();
      }
    }
  };

  // Handle double-tap to toggle fullscreen
  const handleImageClick = (e) => {
    // Only toggle fullscreen on double tap (not during pinch)
    if (e.touches && e.touches.length > 1) return;

    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTimeRef.current;

    // If less than 300ms since last tap, it's a double-tap
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      setIsFullscreen(!isFullscreen);
      if (isFullscreen) {
        // Reset zoom when exiting fullscreen
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
      lastTapTimeRef.current = 0; // Reset to prevent triple-tap from triggering
    } else {
      // First tap, just record the time
      lastTapTimeRef.current = currentTime;
    }
  };

  // Handle pinch to zoom in fullscreen mode
  const handleTouchStartFullscreen = (e) => {
    if (!isFullscreen) return;

    if (e.touches.length === 2) {
      // Calculate initial distance between two fingers
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastTouchDistanceRef.current = distance;

      // Calculate center point between fingers
      lastTouchCenterRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    } else if (e.touches.length === 1 && scale > 1) {
      // Single touch while zoomed - prepare for panning
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      panStartPositionRef.current = { ...position };
    }
  };

  const handleTouchMoveFullscreen = (e) => {
    if (!isFullscreen) return;

    if (e.touches.length === 2 && lastTouchDistanceRef.current) {
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      // Calculate scale change
      const scaleChange = distance / lastTouchDistanceRef.current;
      const newScale = Math.max(1, Math.min(scale * scaleChange, 5)); // Limit between 1x and 5x

      setScale(newScale);
      lastTouchDistanceRef.current = distance;
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan when zoomed in - calculate cumulative delta from initial touch
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      setPosition({
        x: panStartPositionRef.current.x + deltaX,
        y: panStartPositionRef.current.y + deltaY
      });
    }
  };

  const handleTouchEndFullscreen = () => {
    lastTouchDistanceRef.current = null;
    lastTouchCenterRef.current = null;
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="h-full flex flex-col">
        {/* Header - hidden in fullscreen */}
        {!isFullscreen && (
          <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>

            <h2 className="text-lg font-semibold">
              Pose {currentIndex + 1} of {totalImages}
            </h2>

            <button
              onClick={onToggleFavorite}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              <Heart
                size={24}
                className={image.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
              />
            </button>
          </div>
        )}

        {/* Image container with navigation */}
        <div
          className="flex-1 flex items-center justify-center relative overflow-hidden"
          onTouchStart={isFullscreen ? handleTouchStartFullscreen : handleTouchStart}
          onTouchMove={isFullscreen ? handleTouchMoveFullscreen : undefined}
          onTouchEnd={isFullscreen ? handleTouchEndFullscreen : handleTouchEnd}
        >
          <img
            ref={imageRef}
            src={image.src}
            alt={`Pose ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            style={isFullscreen ? {
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? 'move' : 'pointer',
              touchAction: 'none',
              willChange: 'transform',
              transition: 'none'
            } : {}}
            onClick={handleImageClick}
          />

          {/* Navigation arrows - circular buttons on edges */}
          {!isFullscreen && currentIndex > 0 && (
            <button
              onClick={onPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-3 rounded-full transition-all cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {!isFullscreen && currentIndex < totalImages - 1 && (
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-3 rounded-full transition-all cursor-pointer"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Footer - hidden in fullscreen */}
        {!isFullscreen && (
          <div
            className={`bg-gray-900 p-4 ${image.notes ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}`}
            onClick={() => image.notes && setShowNotesModal(true)}
          >
            <div className="max-w-4xl mx-auto min-h-[40px]">
              <div className="flex items-center justify-between gap-4">
                {/* Tags - max 3 */}
                <div className="flex flex-wrap gap-2 flex-1 min-w-0 min-h-[32px] items-center">
                  {image.tags && image.tags.length > 0 ? (
                    <>
                      {image.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="bg-purple-600 text-white text-sm px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {image.tags.length > 3 && (
                        <span className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full">
                          +{image.tags.length - 3}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 text-sm">No tags</span>
                  )}
                </div>

                {/* Date and Notes indicator */}
                <div className="flex items-center gap-3 text-gray-400 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>
                      {image.dateAdded
                        ? new Date(image.dateAdded).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  {image.notes && (
                    <StickyNote size={16} className="text-blue-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Modal */}
        {showNotesModal && image.notes && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNotesModal(false)}
          >
            <div
              className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-600 rounded-full">
                  <StickyNote size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Notes</h3>
                  <p className="text-sm text-gray-400">Pose {currentIndex + 1}</p>
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-gray-300 whitespace-pre-wrap">{image.notes}</p>
              </div>
              <button
                onClick={() => setShowNotesModal(false)}
                className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
