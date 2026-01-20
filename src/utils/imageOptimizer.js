// Image optimization utilities for converting and compressing images to .webp format

/**
 * Converts an image file to optimized .webp format
 * @param {File} file - The image file to convert
 * @param {Object} options - Optimization options
 * @param {number} options.maxWidth - Maximum width (default: 1920)
 * @param {number} options.maxHeight - Maximum height (default: 1920)
 * @param {number} options.quality - WebP quality 0-1 (default: 0.85)
 * @returns {Promise<string>} - Base64 data URL of the optimized image
 */
export const convertToWebP = (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85
  } = options;

  return new Promise((resolve, reject) => {
    // Create a FileReader to read the original file
    const reader = new FileReader();

    reader.onload = (e) => {
      // Create an image element to load the file
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        // Only resize if image exceeds max dimensions
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = maxWidth;
            height = Math.round(width / aspectRatio);
          } else {
            height = maxHeight;
            width = Math.round(height * aspectRatio);
          }
        }

        // Create a canvas to draw and convert the image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        // Optional: Apply image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the image on the canvas with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP format with compression
        try {
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          resolve(webpDataUrl);
        } catch (error) {
          // If WebP conversion fails (e.g., unsupported browser), fallback to JPEG
          console.warn('WebP conversion failed, falling back to JPEG:', error);
          const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegDataUrl);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Converts multiple image files to optimized .webp format
 * @param {FileList|Array} files - Array of image files to convert
 * @param {Object} options - Optimization options (same as convertToWebP)
 * @returns {Promise<Array>} - Array of optimized image data URLs
 */
export const convertMultipleToWebP = async (files, options = {}) => {
  const fileArray = Array.from(files);
  const conversionPromises = fileArray.map(file => convertToWebP(file, options));
  return Promise.all(conversionPromises);
};

/**
 * Converts an image file to thumbnail size
 * @param {File} file - The image file to convert
 * @param {Object} options - Thumbnail options
 * @param {number} options.maxWidth - Maximum width (default: 400)
 * @param {number} options.maxHeight - Maximum height (default: 400)
 * @param {number} options.quality - WebP quality 0-1 (default: 0.8)
 * @returns {Promise<string>} - Base64 data URL of the thumbnail
 */
export const convertToThumbnail = (file, options = {}) => {
  return convertToWebP(file, {
    maxWidth: options.maxWidth || 400,
    maxHeight: options.maxHeight || 400,
    quality: options.quality || 0.8
  });
};

/**
 * Estimates the size reduction percentage
 * @param {string} originalDataUrl - Original image data URL
 * @param {string} optimizedDataUrl - Optimized image data URL
 * @returns {number} - Percentage of size reduction
 */
export const calculateSizeReduction = (originalDataUrl, optimizedDataUrl) => {
  const originalSize = originalDataUrl.length;
  const optimizedSize = optimizedDataUrl.length;
  const reduction = ((originalSize - optimizedSize) / originalSize) * 100;
  return Math.round(reduction);
};
