import React, { useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export default function FullscreenViewer({ src, alt, onClose }) {
  const lastTapRef = useRef(0);
  const transformWrapperRef = useRef(null);

  // Auto-close when user pinches back to scale ≤ 1
  const handleTransform = useCallback((ref) => {
    const { scale } = ref.state;
    // When user releases and scale settles back to ~1, close
    if (scale <= 1.02 && scale > 0) {
      // Small delay to let the animation finish before checking intent
      // Only close if they were previously zoomed in
      if (ref.state.previousScale > 1.1) {
        setTimeout(() => {
          if (ref.state.scale <= 1.02) {
            onClose();
          }
        }, 200);
      }
    }
  }, [onClose]);

  // Track double-tap to zoom out → close
  const handleDoubleClick = useCallback(() => {
    const wrapper = transformWrapperRef.current;
    if (wrapper) {
      const { scale } = wrapper.state;
      if (scale > 1.1) {
        // Currently zoomed in — reset to 1x, then close
        wrapper.resetTransform(200);
        setTimeout(() => onClose(), 250);
      }
      // If at 1x, the library's own doubleClick handler will zoom in
    }
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      {/* Close button - always on top */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[70] bg-black bg-opacity-50 hover:bg-opacity-80 p-2 rounded-full transition-colors cursor-pointer"
        aria-label="Close fullscreen"
      >
        <X size={24} className="text-white" />
      </button>

      <TransformWrapper
        ref={transformWrapperRef}
        initialScale={1}
        minScale={0.5}
        maxScale={8}
        centerOnInit={true}
        doubleClick={{
          mode: 'toggle',
          step: 2,
          animationTime: 200,
        }}
        pinch={{
          step: 5,
        }}
        panning={{
          velocityDisabled: false,
        }}
        wheel={{
          step: 0.2,
        }}
        onPinchingStop={(ref) => {
          // Check if they pinched back to 1x
          if (ref.state.scale <= 1.05) {
            ref.resetTransform(150);
            setTimeout(() => onClose(), 200);
          }
        }}
        onDoubleClick={(ref) => {
          // If they were zoomed in and double-clicked to reset, close after reset
          if (ref.state.previousScale > 1.5 && ref.state.scale <= 1.05) {
            setTimeout(() => onClose(), 250);
          }
        }}
      >
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            height: '100%',
          }}
          contentStyle={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={src}
            alt={alt || 'Fullscreen image'}
            style={{
              maxWidth: '100%',
              maxHeight: '100dvh',
              objectFit: 'contain',
              userSelect: 'none',
              WebkitUserDrag: 'none',
            }}
            draggable={false}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
