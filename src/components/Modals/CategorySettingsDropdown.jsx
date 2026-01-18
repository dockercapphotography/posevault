import React from 'react';
import { FileText, Camera, Trash2 } from 'lucide-react';

export default function CategorySettingsDropdown({ 
  category, 
  onEditSettings, 
  onUploadCover, 
  onDelete,
  onClose
}) {
  return (
    <div 
      className="bg-gray-700 rounded-lg shadow-xl border border-gray-600 overflow-hidden min-w-[180px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onEditSettings(category.id);
          onClose();
        }}
        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2"
      >
        <FileText size={16} />
        <span>Edit Name & Notes</span>
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
      <button
        onClick={() => {
          onDelete(category.id);
          onClose();
        }}
        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-600 transition-colors flex items-center gap-2 text-red-400"
      >
        <Trash2 size={16} />
        <span>Delete Category</span>
      </button>
    </div>
  );
}