import React from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function StorageLimitModal({
  requiredMB,
  availableMB,
  usedDisplay,
  maxDisplay,
  onClose
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-full">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold">Storage Limit Reached</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            You don't have enough storage space to upload these images.
          </p>
          
          <div className="bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Required:</span>
              <span className="font-semibold text-red-400">{requiredMB.toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Available:</span>
              <span className="font-semibold text-orange-400">{availableMB.toFixed(2)} MB</span>
            </div>
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Usage:</span>
                <span className="font-semibold">{usedDisplay} / {maxDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium"
          >
            Got It
          </button>
          
          <p className="text-sm text-gray-400 text-center">
            Free up space by deleting unused images or galleries
          </p>
        </div>
      </div>
    </div>
  );
}
