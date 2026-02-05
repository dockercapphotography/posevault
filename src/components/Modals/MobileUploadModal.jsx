import React, { useRef } from 'react';
import { X, Camera, Image } from 'lucide-react';

export default function MobileUploadModal({ categoryId, onUpload, onClose }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e, categoryId);
      onClose();
    }
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    galleryInputRef.current?.click();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end sm:items-center justify-center z-40">
      <div className="bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm sm:mx-4 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Upload Images</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Take Photo Option */}
          <button
            onClick={triggerCamera}
            className="w-full flex items-center gap-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Camera size={24} />
            </div>
            <div className="text-left">
              <p className="font-medium">Take Photo</p>
              <p className="text-sm text-gray-400">Use your camera</p>
            </div>
          </button>

          {/* Photo Gallery Option */}
          <button
            onClick={triggerGallery}
            className="w-full flex items-center gap-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <Image size={24} />
            </div>
            <div className="text-left">
              <p className="font-medium">Photo Gallery</p>
              <p className="text-sm text-gray-400">Choose from your photos</p>
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    {/* Hidden file inputs - outside modal so they persist after close */}
    <input
      ref={cameraInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleFileChange}
      className="hidden"
    />
    <input
      ref={galleryInputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={handleFileChange}
      className="hidden"
    />
    </>
  );
}
