import React from 'react';
import { X } from 'lucide-react';

export default function DeleteConfirmModal({ category, onConfirm, onClose }) {
  if (!category) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-500">Delete Gallery?</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-300 mb-2">
          Are you sure you want to delete <strong className="text-white">"{category.name}"</strong>?
        </p>

        <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm">
            ⚠️ This will permanently delete:
          </p>
          <ul className="list-disc list-inside text-red-300 text-sm ml-2 mt-1">
            <li>{category.images?.length || 0} pose images</li>
            <li>All tags and notes</li>
            <li>Gallery cover photo</li>
            <li>Gallery notes</li>
          </ul>
          <p className="text-red-400 font-semibold text-sm mt-2">
            This action cannot be undone!
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg transition-colors font-semibold cursor-pointer"
          >
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}
