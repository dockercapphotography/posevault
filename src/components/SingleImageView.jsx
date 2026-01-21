import React, { useState, useRef, useEffect } from 'react';
import { X, Heart, ChevronLeft, ChevronRight, Calendar, StickyNote } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

export default function SingleImageView({
  image,
  currentIndex,
  totalImages,
  categoryName,
  category,
  onClose,
  onToggleFavorite,
  onPrevious,
  onNext
}) {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const swiperRef = useRef(null);

  if (!image || !category?.images) return null;

  // Generate pose name - use custom name or create default based on category
  const getDisplayPoseName = (idx) => {
    const img = category.images[idx];
    return img?.poseName || `${categoryName} - ${String(idx + 1).padStart(2, '0')}`;
  };

  const displayPoseName = getDisplayPoseName(activeIndex);
  const currentImage = category.images[activeIndex];

  // Sync Swiper with external currentIndex changes
  useEffect(() => {
    if (swiperRef.current && activeIndex !== currentIndex) {
      swiperRef.current.slideTo(currentIndex, 0); // 0 = no animation for external changes
      setActiveIndex(currentIndex);
    }
  }, [currentIndex]);

  // Reset modal when image changes
  useEffect(() => {
    setShowNotesModal(false);
  }, [activeIndex]);

  const handleSlideChange = (swiper) => {
    const newIndex = swiper.activeIndex;
    setActiveIndex(newIndex);
    
    // Notify parent of the change
    if (newIndex > activeIndex) {
      onNext();
    } else if (newIndex < activeIndex) {
      onPrevious();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between min-h-[68px]">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>

          <div className="text-center flex-1 mx-4">
            <h2 className="text-lg font-semibold">{displayPoseName}</h2>
            <p className="text-sm text-gray-400">
              Pose {activeIndex + 1} of {totalImages}
            </p>
          </div>

          <button
            onClick={() => {
              const idx = activeIndex;
              onToggleFavorite(idx);
            }}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <Heart
              size={24}
              className={currentImage?.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
            />
          </button>
        </div>

        {/* Swiper Container */}
        <div className="flex-1 relative overflow-hidden">
          <Swiper
            modules={[Navigation, Keyboard]}
            initialSlide={currentIndex}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={handleSlideChange}
            navigation={{
              prevEl: '.swiper-button-prev-custom',
              nextEl: '.swiper-button-next-custom',
            }}
            keyboard={{
              enabled: true,
            }}
            speed={300}
            className="h-full"
          >
            {category.images.map((img, idx) => (
              <SwiperSlide key={idx} className="h-full">
                <div className="h-full w-full flex items-center justify-center">
                  <img
                    src={img.src}
                    alt={`Pose ${idx + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation Arrows - hidden on mobile */}
          <button
            className="swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-3 rounded-full transition-all cursor-pointer z-10 hidden md:flex"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className="swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-3 rounded-full transition-all cursor-pointer z-10 hidden md:flex"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Footer */}
        {currentImage && (
          <div
            className={`bg-gray-900 p-3 ${currentImage.notes ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}`}
            onClick={() => currentImage.notes && setShowNotesModal(true)}
          >
            <div className="max-w-4xl mx-auto h-[32px]">
              <div className="flex items-center justify-between gap-4 h-full">
                {/* Tags - max 3 */}
                <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 items-center overflow-hidden">
                  {currentImage.tags && currentImage.tags.length > 0 ? (
                    <>
                      {currentImage.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                          {tag}
                        </span>
                      ))}
                      {currentImage.tags.length > 3 && (
                        <span className="bg-gray-700 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                          +{currentImage.tags.length - 3}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 text-xs">No tags</span>
                  )}
                </div>

                {/* Date and Notes indicator */}
                <div className="flex items-center gap-2 text-gray-400 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>
                      {currentImage.dateAdded
                        ? new Date(currentImage.dateAdded).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  {currentImage.notes && (
                    <StickyNote size={14} className="text-blue-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Modal */}
        {showNotesModal && currentImage?.notes && (
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
                  <p className="text-sm text-gray-400">Pose {activeIndex + 1}</p>
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-gray-300 whitespace-pre-wrap">{currentImage.notes}</p>
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
