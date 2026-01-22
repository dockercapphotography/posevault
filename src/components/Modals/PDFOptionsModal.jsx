import React, { useState, useEffect } from 'react';
import { X, FileText, Grid3x3, List, Grid, Download } from 'lucide-react';
import { generatePDFReferenceSheet } from '../../utils/pdfGenerator';

export default function PDFOptionsModal({ category, onClose }) {
  const [layout, setLayout] = useState('grid');
  const [imagesPerPage, setImagesPerPage] = useState(6);
  const [includePoseName, setIncludePoseName] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeDate, setIncludeDate] = useState(false);
  const [pageOrientation, setPageOrientation] = useState('portrait');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Update images per page based on layout
  useEffect(() => {
    if (layout === 'grid') {
      setImagesPerPage(6);
    } else if (layout === 'list') {
      setImagesPerPage(3);
      setIncludeNotes(true);
    } else if (layout === 'contact-sheet') {
      setImagesPerPage(12);
      setIncludePoseName(true);
      setIncludeTags(false);
      setIncludeNotes(false);
    }
  }, [layout]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Estimate time based on image count (roughly 0.5-1 second per image)
    const totalImages = category.images.length;
    const estimatedSeconds = Math.ceil((totalImages * 0.7) + 2); // +2 for title and summary pages
    setEstimatedTime(estimatedSeconds);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until actually done
          return prev + (100 / (estimatedSeconds * 2)); // Gradual progress
        });
      }, 500);
      
      await generatePDFReferenceSheet(category, {
        layout,
        imagesPerPage,
        includePoseName,
        includeTags,
        includeNotes,
        includeDate,
        pageOrientation
      });
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      // Brief delay to show 100% before closing
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      setGenerationProgress(0);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText size={24} className="text-blue-500" />
            PDF Reference Sheet Options
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Layout Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Layout Style</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setLayout('grid')}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  layout === 'grid'
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <Grid3x3 size={24} className="mx-auto mb-1" />
                <div className="text-xs">Grid</div>
                <div className="text-xs text-gray-400">6 per page</div>
              </button>
              <button
                onClick={() => setLayout('list')}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  layout === 'list'
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <List size={24} className="mx-auto mb-1" />
                <div className="text-xs">List</div>
                <div className="text-xs text-gray-400">3 per page</div>
              </button>
              <button
                onClick={() => setLayout('contact-sheet')}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  layout === 'contact-sheet'
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <Grid size={24} className="mx-auto mb-1" />
                <div className="text-xs">Contact</div>
                <div className="text-xs text-gray-400">12 per page</div>
              </button>
            </div>
          </div>

          {/* Page Orientation */}
          <div>
            <label className="block text-sm font-semibold mb-2">Page Orientation</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPageOrientation('portrait')}
                className={`p-2 rounded-lg border-2 transition-all cursor-pointer ${
                  pageOrientation === 'portrait'
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-sm">Portrait</div>
              </button>
              <button
                onClick={() => setPageOrientation('landscape')}
                className={`p-2 rounded-lg border-2 transition-all cursor-pointer ${
                  pageOrientation === 'landscape'
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-sm">Landscape</div>
              </button>
            </div>
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-sm font-semibold mb-2">Include in PDF</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePoseName}
                  onChange={(e) => setIncludePoseName(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Pose Names</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTags}
                  onChange={(e) => setIncludeTags(e.target.checked)}
                  disabled={layout === 'contact-sheet'}
                  className="w-4 h-4 cursor-pointer disabled:opacity-50"
                />
                <span className="text-sm">Tags</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  disabled={layout !== 'list'}
                  className="w-4 h-4 cursor-pointer disabled:opacity-50"
                />
                <span className="text-sm">Notes (List layout only)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDate}
                  onChange={(e) => setIncludeDate(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Date Added</span>
              </label>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-3">
            <p className="text-xs text-blue-200">
              📄 The PDF will include a title page and summary index for easy reference. 
              Total pages: ~{Math.ceil(category.images.length / imagesPerPage) + 2}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              isGenerating
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              isGenerating
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            }`}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating... {Math.round(generationProgress)}%</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Generate PDF</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Processing {category.images.length} images...</span>
              <span>~{estimatedTime}s remaining</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
