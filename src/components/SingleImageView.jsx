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
  onNext,
  onUpdateImage
}) {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const swiperRef = useRef(null);
  const nameInputRef = useRef(null);

  if (!image || !category?.images) return null;

  // Filter out cover images
  const galleryImages = category.images.filter(img => !img.isCover);

  // Generate pose name - use custom name or create default based on category
  const getDisplayPoseName = (idx) => {
    const img = galleryImages[idx];
    return img?.poseName || `${categoryName} - ${String(idx + 1).padStart(2, '0')}`;
  };

  const displayPoseName = getDisplayPoseName(activeIndex);
  const currentImage = galleryImages[activeIndex];

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
    setShowTagsModal(false);
    setIsEditingName(false);
  }, [activeIndex]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSlideChange = (swiper) => {
    const newIndex = swiper.activeIndex;
    setActiveIndex(newIndex);
  };

  const handleStartEditName = () => {
    setEditedName(currentImage?.poseName || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (onUpdateImage && editedName.trim() !== '') {
      // Save the pose name
      onUpdateImage(category.id, activeIndex, { poseName: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEditName();
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
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={handleSaveName}
                  className="bg-gray-700 text-white px-3 py-1 rounded text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-purple-600 max-w-md"
                  placeholder="Enter pose name..."
                />
              </div>
            ) : (
              <h2 
                className="text-lg font-semibold cursor-pointer hover:text-purple-400 transition-colors"
                onClick={handleStartEditName}
                title="Click to edit pose name"
              >
                {displayPoseName}
              </h2>
            )}
            <p className="text-sm text-gray-400">
              Pose {activeIndex + 1} of {galleryImages.length}
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
            {category.images.filter(img => !img.isCover).map((img, idx) => (
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
            className={`swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-3 rounded-full transition-all cursor-pointer z-10 hidden md:flex ${
              activeIndex === 0 ? 'opacity-0 pointer-events-none' : ''
            }`}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className={`swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 p-3 rounded-full transition-all cursor-pointer z-10 hidden md:flex ${
              activeIndex >= galleryImages.length - 1 ? 'opacity-0 pointer-events-none' : ''
            }`}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Footer */}
        {currentImage && (
          <div className="bg-gray-900 p-3">
            <div className="max-w-4xl mx-auto h-[32px]">
              <div className="flex items-center justify-between gap-4 h-full">
                {/* Tags - max 3 - clickable */}
                <div 
                  className={`flex flex-wrap gap-1.5 flex-1 min-w-0 items-center overflow-hidden ${
                    currentImage.tags && currentImage.tags.length > 0 ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                  }`}
                  onClick={() => currentImage.tags && currentImage.tags.length > 0 && setShowTagsModal(true)}
                >
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
                            year: 'numeric',
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  {currentImage.notes && (
                    <button
                      onClick={() => setShowNotesModal(true)}
                      className="hover:text-blue-300 transition-colors"
                    >
                      <StickyNote size={14} className="text-blue-400" />
                    </button>
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

        {/* Tags Modal */}
        {showTagsModal && currentImage?.tags && currentImage.tags.length > 0 && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTagsModal(false)}
          >
            <div
              className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-600 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Tags</h3>
                  <p className="text-sm text-gray-400">Pose {activeIndex + 1}</p>
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  {currentImage.tags.map((tag, i) => (
                    <span key={i} className="bg-purple-600 text-white text-sm px-3 py-1.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
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
    </div>
  );
}
