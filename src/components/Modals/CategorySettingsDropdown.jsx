import React, { useState } from 'react';
import { FileText, Camera, Trash2, Download, File } from 'lucide-react';
import { downloadCategoryAsZip } from '../../utils/zipDownloader';

export default function CategorySettingsDropdown({ 
  category, 
  onEditSettings, 
  onUploadCover, 
  onDelete,
  onGeneratePDF,
  onClose
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadZip = async () => {
    if (category.images.length === 0) {
      alert('No images to download in this category');
      return;
    }

    setIsDownloading(true);
    try {
      await downloadCategoryAsZip(category);
    } finally {
      setIsDownloading(false);
      onClose();
    }
  };

  return (
    <div 
      className="bg-gray-700 rounded-lg shadow-xl border border-gray-600 overflow-hidden min-w-[200px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onEditSettings(category.id);
          onClose();
        }}
        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <FileText size={16} />
        <span>Category Settings</span>
      </button>
      
      <label className="block cursor-pointer hover:bg-gray-600 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            onUploadCover(e, category.id);
            onClose();
          }}
          className="hidden"
        />
        <div className="px-4 py-2 text-sm flex items-center gap-2">
          <Camera size={16} />
          <span>{category.cover ? 'Change Cover' : 'Upload Cover'}</span>
        </div>
      </label>

      <div className="border-t border-gray-600 my-1"></div>

      <button
        onClick={() => {
          onGeneratePDF();
          onClose();
        }}
        disabled={category.images.length === 0}
        className={`w-full px-4 py-2 text-sm text-left transition-colors flex items-center gap-2 ${
          category.images.length === 0
            ? 'text-gray-500 cursor-not-allowed'
            : 'hover:bg-gray-600 text-green-400 cursor-pointer'
        }`}
      >
        <File size={16} />
        <span>
          {category.images.length === 0
            ? 'No Images for PDF'
            : 'Download Ref. Sheet'
          }
        </span>
      </button>

      <button
        onClick={handleDownloadZip}
        disabled={isDownloading || category.images.length === 0}
        className={`w-full px-4 py-2 text-sm text-left transition-colors flex items-center gap-2 ${
          isDownloading || category.images.length === 0
            ? 'text-gray-500 cursor-not-allowed'
            : 'hover:bg-gray-600 text-blue-400 cursor-pointer'
        }`}
      >
        <Download size={16} />
        <span>
          {isDownloading 
            ? 'Downloading...' 
            : category.images.length === 0
            ? 'No Images to Download'
            : `Download ZIP (${category.images.length})`
          }
        </span>
      </button>

      <div className="border-t border-gray-600 my-1"></div>

      <button
        onClick={() => {
          onDelete(category.id);
          onClose();
        }}
        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2 text-red-400 cursor-pointer"
      >
        <Trash2 size={16} />
        <span>Delete Category</span>
      </button>
    </div>
  );
}
