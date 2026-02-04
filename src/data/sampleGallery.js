/**
 * Sample Gallery Data for New Users
 *
 * This gallery is automatically created for new users to help them
 * learn how to use PoseVault through the tutorial.
 *
 * Images provided courtesy of Arthur AG @Creative Prints Shelf
 * https://www.etsy.com/shop/CreativePrintsShelf
 */

const ATTRIBUTION_NOTE = 'This is a sample Family Pose image. Photo provided courtesy of Arthur AG @Creative Prints Shelf - https://www.etsy.com/shop/CreativePrintsShelf';

const GALLERY_ATTRIBUTION = 'This is a sample gallery of Family Poses. Cover photo provided courtesy of Arthur AG @Creative Prints Shelf - https://www.etsy.com/shop/CreativePrintsShelf';

export const sampleGalleryData = {
  name: 'Sample Family Gallery',
  notes: GALLERY_ATTRIBUTION,
  tags: ['sample', 'family'],
  isPrivate: false,
  isFavorite: false,
  cover: {
    path: '/sample-gallery/cover.webp',
    tags: ['sample', 'family', 'group', 'man', 'woman', 'children', 'baby'],
  },
  images: [
    {
      path: '/sample-gallery/pose-01.webp',
      poseName: 'Sample Family Pose - 01',
      notes: ATTRIBUTION_NOTE,
      tags: ['sample', 'family', 'group', 'man', 'woman', 'children', 'half-body'],
      isFavorite: false,
    },
    {
      path: '/sample-gallery/pose-02.webp',
      poseName: 'Sample Family Pose - 02',
      notes: ATTRIBUTION_NOTE,
      tags: ['sample', 'family', 'group', 'man', 'woman', 'child', 'baby', 'sitting', 'full-body'],
      isFavorite: false,
    },
    {
      path: '/sample-gallery/pose-03.webp',
      poseName: 'Sample Family Pose - 03',
      notes: ATTRIBUTION_NOTE,
      tags: ['sample', 'family', 'group', 'man', 'woman', 'child', 'kneeling', 'full-body', 'kissing'],
      isFavorite: false,
    },
    {
      path: '/sample-gallery/pose-04.webp',
      poseName: 'Sample Family Pose - 04',
      notes: ATTRIBUTION_NOTE,
      tags: ['sample', 'family', 'man', 'child', 'kneeling', 'full-body'],
      isFavorite: false,
    },
    {
      path: '/sample-gallery/pose-05.webp',
      poseName: 'Sample Family Pose - 05',
      notes: ATTRIBUTION_NOTE,
      tags: ['sample', 'family', 'group', 'man', 'woman', 'children', 'half-body'],
      isFavorite: false,
    },
  ],
};

/**
 * Convert an image path to a data URL by fetching it
 * @param {string} path - The path to the image (e.g., '/sample-gallery/pose-01.webp')
 * @returns {Promise<string>} - The data URL of the image
 */
export async function imagePathToDataUrl(path) {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to load sample image: ${path}`, error);
    return null;
  }
}

/**
 * Build a complete sample gallery with data URLs for all images
 * @returns {Promise<Object>} - The sample gallery ready to be added
 */
export async function buildSampleGallery() {
  const { name, notes, tags, isPrivate, isFavorite, cover, images } = sampleGalleryData;

  // Load cover image
  const coverDataUrl = await imagePathToDataUrl(cover.path);

  // Load all pose images in parallel
  const loadedImages = await Promise.all(
    images.map(async (img) => {
      const src = await imagePathToDataUrl(img.path);
      return {
        src,
        poseName: img.poseName,
        notes: img.notes,
        tags: img.tags,
        isFavorite: img.isFavorite,
        dateAdded: new Date().toISOString(),
        // These will be set during sync
        r2Key: null,
        r2Status: 'pending',
        size: 0, // Will be calculated from blob
      };
    })
  );

  // Filter out any images that failed to load
  const validImages = loadedImages.filter((img) => img.src !== null);

  return {
    name,
    notes,
    tags,
    isPrivate,
    isFavorite,
    cover: coverDataUrl,
    coverTags: cover.tags,
    images: validImages,
  };
}
