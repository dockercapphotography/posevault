/**
 * Sample Gallery - Pre-built gallery shown to new users on first registration.
 * Images are served from /sample-gallery/ in the public folder (no cloud sync needed).
 * This gallery is marked with `isSample: true` so it can be identified and excluded
 * from cloud sync operations.
 */

const CREDIT_NOTE = 'Images courtesy of Arthur – Creative Prints Shelf (https://www.etsy.com/shop/CreativePrintsShelf)';

const SAMPLE_IMAGES = [
  {
    src: '/sample-gallery/sample-pose-01.webp',
    poseName: 'Sample Pose - 01',
    notes: CREDIT_NOTE,
    isFavorite: false,
    isCover: false,
    tags: ['sample', 'family', 'portrait', 'man', 'woman', 'children', '1/2 body'],
    dateAdded: new Date().toISOString(),
    r2Key: null,
    r2Status: 'sample',
    supabaseUid: null,
    size: 0,
  },
  {
    src: '/sample-gallery/sample-pose-02.webp',
    poseName: 'Sample Pose - 02',
    notes: CREDIT_NOTE,
    isFavorite: false,
    isCover: false,
    tags: ['sample', 'family', 'portrait', 'man', 'woman', 'children', 'baby', 'sitting', 'full body'],
    dateAdded: new Date().toISOString(),
    r2Key: null,
    r2Status: 'sample',
    supabaseUid: null,
    size: 0,
  },
  {
    src: '/sample-gallery/sample-pose-03.webp',
    poseName: 'Sample Pose - 03',
    notes: CREDIT_NOTE,
    isFavorite: false,
    isCover: false,
    tags: ['sample', 'family', 'portrait', 'man', 'woman', 'child', 'kneeling', 'full body'],
    dateAdded: new Date().toISOString(),
    r2Key: null,
    r2Status: 'sample',
    supabaseUid: null,
    size: 0,
  },
  {
    src: '/sample-gallery/sample-pose-04.webp',
    poseName: 'Sample Pose - 04',
    notes: CREDIT_NOTE,
    isFavorite: false,
    isCover: false,
    tags: ['sample', 'family', 'portrait', 'man', 'child', 'kneeling', 'full body'],
    dateAdded: new Date().toISOString(),
    r2Key: null,
    r2Status: 'sample',
    supabaseUid: null,
    size: 0,
  },
  {
    src: '/sample-gallery/sample-pose-05.webp',
    poseName: 'Sample Pose - 05',
    notes: CREDIT_NOTE,
    isFavorite: false,
    isCover: false,
    tags: ['sample', 'family', 'portrait', 'man', 'woman', 'child', '1/2 body'],
    dateAdded: new Date().toISOString(),
    r2Key: null,
    r2Status: 'sample',
    supabaseUid: null,
    size: 0,
  },
];

export function createSampleGallery() {
  return {
    id: 1,
    name: 'Sample Gallery',
    cover: '/sample-gallery/sample-cover.webp',
    coverImageUid: null,
    images: SAMPLE_IMAGES.map(img => ({ ...img, dateAdded: new Date().toISOString() })),
    isFavorite: false,
    notes: CREDIT_NOTE,
    isPrivate: false,
    privatePassword: null,
    supabaseUid: null,
    isSample: true,
    tags: ['sample', 'family', 'group', 'portrait', 'man', 'woman', 'children'],
  };
}
