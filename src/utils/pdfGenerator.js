import jsPDF from 'jspdf';

/**
 * Generates a PDF reference sheet from category images
 * @param {Object} category - The category object containing images
 * @param {Object} options - PDF generation options
 * @returns {Promise<boolean>} - Success status
 */
export async function generatePDFReferenceSheet(category, options = {}) {
  try {
    const {
      layout = 'grid', // 'grid', 'list', 'contact-sheet'
      imagesPerPage = layout === 'grid' ? 6 : layout === 'list' ? 3 : 12,
      includeNotes = true,
      includeTags = true,
      includePoseName = true,
      includeDate = false,
      pageOrientation = 'portrait' // 'portrait' or 'landscape'
    } = options;

    if (!category.images || category.images.length === 0) {
      alert('No images to include in reference sheet');
      return false;
    }

    // Create PDF document
    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);

    // Add title page
    addTitlePage(pdf, category, pageWidth, pageHeight, margin);

    // Calculate layout based on images per page
    const cols = layout === 'grid' ? (imagesPerPage === 6 ? 2 : imagesPerPage === 12 ? 3 : 2) : 
                  layout === 'list' ? 1 : 
                  3; // contact-sheet
    const rows = Math.ceil(imagesPerPage / cols);

    let imageIndex = 0;
    const totalImages = category.images.length;

    while (imageIndex < totalImages) {
      pdf.addPage();
      
      // Add header with category name and page number
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`${category.name}`, margin, margin - 3);
      pdf.text(`Page ${pdf.internal.pages.length - 1}`, pageWidth - margin - 20, margin - 3);
      
      // Draw separator line
      pdf.setDrawColor(200);
      pdf.line(margin, margin, pageWidth - margin, margin);

      const cellWidth = usableWidth / cols;
      const cellHeight = (usableHeight - 10) / rows; // -10 for header space

      for (let row = 0; row < rows && imageIndex < totalImages; row++) {
        for (let col = 0; col < cols && imageIndex < totalImages; col++) {
          const image = category.images[imageIndex];
          const x = margin + (col * cellWidth);
          const y = margin + 10 + (row * cellHeight); // +10 for header space

          await addImageToCell(
            pdf, 
            image, 
            x, 
            y, 
            cellWidth, 
            cellHeight, 
            {
              includePoseName,
              includeNotes,
              includeTags,
              includeDate,
              layout,
              index: imageIndex
            }
          );

          imageIndex++;
        }
      }
    }

    // Add index/summary page at the end
    if (totalImages > 6) {
      addSummaryPage(pdf, category, pageWidth, pageHeight, margin);
    }

    // Save the PDF
    const sanitizedName = category.name
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    pdf.save(`${sanitizedName}_reference_sheet.pdf`);
    return true;

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF reference sheet. Please try again.');
    return false;
  }
}

/**
 * Adds title page to PDF
 */
function addTitlePage(pdf, category, pageWidth, pageHeight, margin) {
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  // Title
  pdf.setFontSize(28);
  pdf.setTextColor(0);
  pdf.text(category.name, centerX, centerY - 40, { align: 'center' });

  // Subtitle
  pdf.setFontSize(16);
  pdf.setTextColor(100);
  pdf.text('Photography Pose Reference Sheet', centerX, centerY - 25, { align: 'center' });

  // Stats
  pdf.setFontSize(12);
  pdf.setTextColor(60);
  const stats = [
    `Total Poses: ${category.images.length}`,
    `Favorites: ${category.images.filter(img => img.isFavorite).length}`,
    `Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`
  ];
  
  stats.forEach((stat, i) => {
    pdf.text(stat, centerX, centerY + (i * 8), { align: 'center' });
  });

  // Notes if present
  if (category.notes) {
    pdf.setFontSize(10);
    pdf.setTextColor(80);
    const splitNotes = pdf.splitTextToSize(category.notes, pageWidth - (margin * 4));
    pdf.text(splitNotes, centerX, centerY + 40, { align: 'center', maxWidth: pageWidth - (margin * 4) });
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text('Created with PoseVault', centerX, pageHeight - margin, { align: 'center' });
}

/**
 * Adds an image to a cell in the PDF
 */
async function addImageToCell(pdf, image, x, y, width, height, options) {
  const { includePoseName, includeNotes, includeTags, includeDate, layout, index } = options;
  
  const padding = 3;
  const contentY = y + padding;
  let currentY = contentY;

  // Reserve space for text
  const textHeight = 
    (includePoseName ? 5 : 0) +
    (includeTags && image.tags?.length ? 4 : 0) +
    (includeDate ? 4 : 0) +
    (includeNotes && image.notes ? 8 : 0);

  const imageHeight = height - textHeight - (padding * 2) - 2;
  const imageWidth = width - (padding * 2);

  try {
    // Convert image to base64 if needed and add to PDF
    let imgData = image.src;
    
    // If it's already a data URL, use it directly
    if (!imgData.startsWith('data:')) {
      // Fetch and convert to data URL
      const response = await fetch(imgData);
      const blob = await response.blob();
      imgData = await blobToBase64(blob);
    }

    // Calculate image dimensions to maintain aspect ratio
    const img = await loadImage(imgData);
    const imgRatio = img.width / img.height;
    
    let finalWidth = imageWidth;
    let finalHeight = imageHeight;
    
    if (imgRatio > (imageWidth / imageHeight)) {
      finalHeight = imageWidth / imgRatio;
    } else {
      finalWidth = imageHeight * imgRatio;
    }

    const imgX = x + padding + (imageWidth - finalWidth) / 2;
    const imgY = currentY + (imageHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'JPEG', imgX, imgY, finalWidth, finalHeight);
    
    currentY += imageHeight + 2;

  } catch (error) {
    console.error(`Failed to add image ${index + 1}:`, error);
    // Draw placeholder
    pdf.setDrawColor(200);
    pdf.rect(x + padding, currentY, imageWidth, imageHeight);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text('Image unavailable', x + width / 2, currentY + imageHeight / 2, { align: 'center' });
    currentY += imageHeight + 2;
  }

  // Add pose name
  if (includePoseName) {
    pdf.setFontSize(8);
    pdf.setTextColor(0);
    const poseName = image.poseName || `Pose ${index + 1}`;
    const truncatedName = pdf.splitTextToSize(poseName, width - (padding * 2));
    pdf.text(truncatedName[0], x + padding, currentY);
    currentY += 5;
  }

  // Add tags
  if (includeTags && image.tags && image.tags.length > 0) {
    pdf.setFontSize(6);
    pdf.setTextColor(100);
    const tagText = image.tags.slice(0, 3).join(', ') + (image.tags.length > 3 ? '...' : '');
    const truncatedTags = pdf.splitTextToSize(tagText, width - (padding * 2));
    pdf.text(truncatedTags[0], x + padding, currentY);
    currentY += 4;
  }

  // Add date
  if (includeDate && image.dateAdded) {
    pdf.setFontSize(6);
    pdf.setTextColor(120);
    const dateStr = new Date(image.dateAdded).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
    pdf.text(dateStr, x + padding, currentY);
    currentY += 4;
  }

  // Add notes (if list layout)
  if (includeNotes && layout === 'list' && image.notes) {
    pdf.setFontSize(7);
    pdf.setTextColor(80);
    const splitNotes = pdf.splitTextToSize(image.notes, width - (padding * 2));
    pdf.text(splitNotes.slice(0, 2), x + padding, currentY); // Max 2 lines
  }
}

/**
 * Adds summary page at the end
 */
function addSummaryPage(pdf, category, pageWidth, pageHeight, margin) {
  pdf.addPage();
  
  pdf.setFontSize(16);
  pdf.setTextColor(0);
  pdf.text('Pose Index', margin, margin + 5);

  pdf.setFontSize(8);
  pdf.setTextColor(60);
  
  let y = margin + 15;
  const lineHeight = 5;

  category.images.forEach((image, index) => {
    if (y > pageHeight - margin - 10) {
      pdf.addPage();
      y = margin + 5;
    }

    const poseName = image.poseName || `Pose ${index + 1}`;
    const tags = image.tags?.length ? ` - ${image.tags.slice(0, 2).join(', ')}` : '';
    
    pdf.text(`${index + 1}. ${poseName}${tags}`, margin, y);
    y += lineHeight;
  });
}

/**
 * Helper function to convert blob to base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper function to load image and get dimensions
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
