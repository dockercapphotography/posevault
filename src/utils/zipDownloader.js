/**
 * Downloads all images from a category as a ZIP file
 * Uses JSZip library to create the archive
 * @param {Object} category - The category object containing images
 */
export async function downloadCategoryAsZip(category) {
  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    if (!category.images || category.images.length === 0) {
      alert('No images to download in this category');
      return;
    }

    // Add all images to the zip
    const imagePromises = category.images.map(async (image, index) => {
      try {
        let blob;
        
        // Check if image.src is a data URL (base64)
        if (image.src.startsWith('data:')) {
          // Convert base64 data URL to blob
          const base64Data = image.src.split(',')[1];
          const mimeType = image.src.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: mimeType });
        } else {
          // Fetch the image data (for regular URLs)
          const response = await fetch(image.src);
          blob = await response.blob();
        }
        
        // Create a filename (use custom name or default)
        const poseName = image.poseName || `pose_${String(index + 1).padStart(3, '0')}`;
        const extension = blob.type.split('/')[1] || 'jpg';
        const filename = `${poseName}.${extension}`;
        
        // Add to zip
        zip.file(filename, blob);
      } catch (error) {
        console.error(`Failed to add image ${index + 1} to zip:`, error);
      }
    });

    // Wait for all images to be added
    await Promise.all(imagePromises);

    // Generate the zip file
    const content = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });

    // Create download link with proper filename sanitization
    const sanitizedName = category.name
      .replace(/[^a-z0-9\s-]/gi, '') // Remove special characters
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .toLowerCase();
    
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizedName}.zip`;
    
    // For better browser compatibility
    link.setAttribute('download', `${sanitizedName}.zip`);
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    return true;
  } catch (error) {
    console.error('Error creating zip file:', error);
    alert('Failed to create zip file. Please try again.');
    return false;
  }
}
