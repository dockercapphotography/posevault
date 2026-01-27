import React from 'react';
import { ChevronLeft, Plus, Upload } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Header({
  viewMode,
  categoryName,
  categoryId,
  onBack,
  onAddCategory,
  onUploadPoses,
  onLogout,
  isUploading = false,
  isSaving = false
}) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 p-3 md:p-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 md:gap-3">
          {viewMode !== 'categories' && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft size={20} className="md:w-6 md:h-6" />
            </button>
          )}
          <h1 className="text-lg md:text-2xl font-bold truncate">
            {viewMode === 'categories' ? 'PoseVault' : categoryName || 'Category'}
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {viewMode === 'categories' && (
            <button
              onClick={onAddCategory}
              className="bg-green-600 hover:bg-green-700 px-2 py-2 md:px-4 md:py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-colors text-sm md:text-base cursor-pointer"
            >
              <Plus size={16} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
          {viewMode === 'grid' && onUploadPoses && (
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif"
                onChange={(e) => onUploadPoses(e, categoryId)}
                className="hidden"
                id="header-upload-poses"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  const input = document.getElementById('header-upload-poses');
                  if (input) input.click();
                }}
                className="bg-blue-600 hover:bg-blue-700 px-2 py-2 md:px-4 md:py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-colors text-sm md:text-base cursor-pointer"
              >
                <Upload size={16} className="md:w-5 md:h-5" />
                <span className="hidden md:inline">Add</span>
              </div>
            </label>
          )}
          <UserMenu onLogout={onLogout} isUploading={isUploading} isSaving={isSaving} />
        </div>
      </div>
    </div>
  );
}
