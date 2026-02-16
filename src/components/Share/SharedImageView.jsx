import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Tag } from 'lucide-react';
import { getShareImageUrl } from '../../utils/shareApi';

export default function SharedImageView({ token, images, currentIndex, onClose, onNavigate }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef(null);

  const image = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  // Reset zoom/pan on image change
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.5, 5));
  const handleZoomOut = () => {
    setZoom(z => {
      const newZoom = Math.max(z / 1.5, 1);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers for mobile swipe
  const touchStartRef = useRef(null);

  const handleTouchStart = (e) => {
    if (zoom > 1) {
      // Pan mode
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
      };
    } else {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && zoom > 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy });
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);

    if (zoom <= 1 && touchStartRef.current) {
      const endX = e.changedTouches[0].clientX;
      const diff = endX - touchStartRef.current.x;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && hasPrev) onNavigate(currentIndex - 1);
        if (diff < 0 && hasNext) onNavigate(currentIndex + 1);
      }
      touchStartRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <div className="min-w-0 flex-1">
          {image.name && <p className="text-sm font-medium truncate">{image.name}</p>}
          <p className="text-xs text-gray-400">
            {currentIndex + 1} of {images.length}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={getShareImageUrl(token, image.r2Key)}
          alt={image.name || 'Pose'}
          className="max-w-full max-h-full object-contain pointer-events-none"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
          }}
          draggable={false}
        />

        {/* Navigation arrows */}
        {hasPrev && zoom <= 1 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors cursor-pointer"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {hasNext && zoom <= 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors cursor-pointer"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom info bar */}
      {(image.notes || (image.tags && image.tags.length > 0)) && (
        <div className="px-4 py-3 bg-black/80 z-10">
          {image.tags && image.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {image.tags.map(tag => (
                <span key={tag} className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>
          )}
          {image.notes && (
            <p className="text-sm text-gray-400 mt-1">{image.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
