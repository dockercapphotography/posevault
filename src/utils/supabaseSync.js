import { supabase } from '../supabaseClient';

/**
 * ==========================================
 * CATEGORY SYNC
 * ==========================================
 */

/**
 * Create a category in Supabase
 * @returns {Promise<{ok: boolean, uid?: number, error?: string}>}
 */
export async function createCategory(categoryData, userId) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: categoryData.name,
        notes: categoryData.notes || '',
        favorite: categoryData.isFavorite || false,
        private_gallery: categoryData.isPrivate || false,
        gallery_password: categoryData.galleryPassword || null,
        user_id: userId,
      })
      .select('uid')
      .single();

    if (error) {
      console.error('Supabase category create error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Category created in Supabase:', data.uid);
    return { ok: true, uid: data.uid };
  } catch (err) {
    console.error('Category create exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Update a category in Supabase
 */
export async function updateCategory(categoryUid, updates, userId) {
  if (!categoryUid) {
    return { ok: false, error: 'No category UID' };
  }

  try {
    const supabaseUpdates = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
    if (updates.isFavorite !== undefined) supabaseUpdates.favorite = updates.isFavorite;
    if (updates.isPrivate !== undefined) supabaseUpdates.private_gallery = updates.isPrivate;
    if (updates.galleryPassword !== undefined) supabaseUpdates.gallery_password = updates.galleryPassword;
    if (updates.coverImageUid !== undefined) supabaseUpdates.cover_image_uid = updates.coverImageUid;

    const { data, error } = await supabase
      .from('categories')
      .update(supabaseUpdates)
      .eq('uid', categoryUid)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Supabase category update error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Category updated in Supabase:', categoryUid);
    return { ok: true, data };
  } catch (err) {
    console.error('Category update exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Soft-delete a category in Supabase
 */
export async function deleteCategory(categoryUid, userId) {
  if (!categoryUid) {
    return { ok: false, error: 'No category UID' };
  }

  try {
    const { error } = await supabase
      .from('categories')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('uid', categoryUid)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase category delete error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Category soft-deleted in Supabase:', categoryUid);
    return { ok: true };
  } catch (err) {
    console.error('Category delete exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * ==========================================
 * IMAGE SYNC
 * ==========================================
 */

/**
 * Create an image record in Supabase
 * @returns {Promise<{ok: boolean, uid?: number, error?: string}>}
 */
export async function createImage(imageData, categoryUid, userId) {
  try {
    const { data, error } = await supabase
      .from('images')
      .insert({
        name: imageData.poseName || imageData.name || 'Untitled',
        notes: imageData.notes || '',
        favorite: imageData.isFavorite || false,
        image_size: imageData.size || 0,
        r2_key: imageData.r2Key,
        category_uid: categoryUid,
        user_id: userId,
      })
      .select('uid')
      .single();

    if (error) {
      console.error('Supabase image create error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Image created in Supabase:', data.uid);
    return { ok: true, uid: data.uid };
  } catch (err) {
    console.error('Image create exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Update image metadata in Supabase
 */
export async function updateImage(imageUid, updates, userId) {
  if (!imageUid) {
    return { ok: false, error: 'No image UID' };
  }

  try {
    const supabaseUpdates = {
      updated_at: new Date().toISOString(),
    };

    if (updates.poseName !== undefined) supabaseUpdates.name = updates.poseName;
    if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
    if (updates.isFavorite !== undefined) supabaseUpdates.favorite = updates.isFavorite;

    const { data, error } = await supabase
      .from('images')
      .update(supabaseUpdates)
      .eq('uid', imageUid)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Supabase image update error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Image updated in Supabase:', imageUid);
    return { ok: true, data };
  } catch (err) {
    console.error('Image update exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Soft-delete an image in Supabase
 */
export async function deleteImage(imageUid, userId) {
  if (!imageUid) {
    return { ok: false, error: 'No image UID' };
  }

  try {
    const { error } = await supabase
      .from('images')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('uid', imageUid)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase image delete error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Image soft-deleted in Supabase:', imageUid);
    return { ok: true };
  } catch (err) {
    console.error('Image delete exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Find image by r2_key (useful when we don't have the UID yet)
 */
export async function findImageByR2Key(r2Key, userId) {
  try {
    const { data, error } = await supabase
      .from('images')
      .select('uid')
      .eq('r2_key', r2Key)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, uid: data.uid };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * ==========================================
 * TAG SYNC
 * ==========================================
 */

/**
 * Get or create a tag in the tags table
 * @returns {Promise<{ok: boolean, uid?: number, error?: string}>}
 */
export async function getOrCreateTag(tagName, userId) {
  const normalized = tagName.toLowerCase().trim();

  try {
    // First, try to find existing tag (maybeSingle avoids 406 error on zero rows)
    const { data: existing, error: selectError } = await supabase
      .from('tags')
      .select('uid')
      .eq('name', normalized)
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('Tag lookup error:', selectError);
    }

    if (existing) {
      console.log('Found existing tag:', normalized, existing.uid);
      return { ok: true, uid: existing.uid, created: false };
    }

    // Tag doesn't exist — create it
    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: normalized,
        user_id: userId,
      })
      .select('uid')
      .single();

    if (error) {
      // If insert failed (e.g. unique constraint), try to look up again
      console.warn('Tag insert failed, re-looking up:', error.message);
      const { data: retry } = await supabase
        .from('tags')
        .select('uid')
        .eq('name', normalized)
        .eq('user_id', userId)
        .maybeSingle();

      if (retry) {
        console.log('Found tag on retry:', normalized, retry.uid);
        return { ok: true, uid: retry.uid, created: false };
      }

      console.error('Supabase tag create error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Tag created in Supabase:', normalized, data.uid);
    return { ok: true, uid: data.uid, created: true };
  } catch (err) {
    console.error('Tag create exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Sync tags for an image (handles add/remove)
 */
export async function syncImageTags(imageUid, tags, userId) {
  if (!imageUid) {
    return { ok: false, error: 'No image UID' };
  }

  try {
    // Get current tags for this image
    const { data: currentTags, error: selectError } = await supabase
      .from('image_tags')
      .select('uid, tag_uid, image_uid')
      .eq('image_uid', imageUid);

    if (selectError) {
      console.error('image_tags SELECT error:', selectError);
    }

    // Separately fetch tag names for current image_tags entries
    const currentTagEntries = [];
    for (const it of (currentTags || [])) {
      const { data: tagData } = await supabase
        .from('tags')
        .select('name')
        .eq('uid', it.tag_uid)
        .single();
      if (tagData) {
        currentTagEntries.push({ ...it, tagName: tagData.name });
      }
    }

    const currentTagNames = currentTagEntries.map(t => t.tagName);
    const newTagNames = tags.map(t => t.toLowerCase().trim());

    // Tags to add
    const tagsToAdd = newTagNames.filter(t => !currentTagNames.includes(t));

    // Tags to remove
    const tagsToRemove = currentTagEntries.filter(
      t => !newTagNames.includes(t.tagName)
    );

    // Remove old tags
    for (const tag of tagsToRemove) {
      const { error: deleteError } = await supabase
        .from('image_tags')
        .delete()
        .eq('uid', tag.uid);
      if (deleteError) {
        console.error('image_tags DELETE error:', deleteError);
      }
    }

    // Add new tags
    for (const tagName of tagsToAdd) {
      const tagResult = await getOrCreateTag(tagName, userId);
      if (tagResult.ok) {
        const { data: insertData, error: insertError } = await supabase
          .from('image_tags')
          .insert({
            image_uid: imageUid,
            tag_uid: tagResult.uid,
            created_at: new Date().toISOString(),
          })
          .select();

        if (insertError) {
          console.error('image_tags INSERT error:', insertError);
          console.error('Attempted insert:', { image_uid: imageUid, tag_uid: tagResult.uid });
        } else {
          console.log('image_tags entry created:', insertData);
        }
      }
    }

    console.log('Image tags synced:', { added: tagsToAdd.length, removed: tagsToRemove.length });
    return { ok: true };
  } catch (err) {
    console.error('Image tags sync exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Sync tags for a category
 */
export async function syncCategoryTags(categoryUid, tags, userId) {
  if (!categoryUid) {
    return { ok: false, error: 'No category UID' };
  }

  try {
    // Get current tags for this category
    const { data: currentTags, error: selectError } = await supabase
      .from('category_tags')
      .select('uid, tag_uid, category_uid')
      .eq('category_uid', categoryUid);

    if (selectError) {
      console.error('category_tags SELECT error:', selectError);
    }

    // Separately fetch tag names for current entries
    const currentTagEntries = [];
    for (const ct of (currentTags || [])) {
      const { data: tagData } = await supabase
        .from('tags')
        .select('name')
        .eq('uid', ct.tag_uid)
        .single();
      if (tagData) {
        currentTagEntries.push({ ...ct, tagName: tagData.name });
      }
    }

    const currentTagNames = currentTagEntries.map(t => t.tagName);
    const newTagNames = tags.map(t => t.toLowerCase().trim());

    // Tags to add
    const tagsToAdd = newTagNames.filter(t => !currentTagNames.includes(t));

    // Tags to remove
    const tagsToRemove = currentTagEntries.filter(
      t => !newTagNames.includes(t.tagName)
    );

    // Remove old tags
    for (const tag of tagsToRemove) {
      const { error: deleteError } = await supabase
        .from('category_tags')
        .delete()
        .eq('uid', tag.uid);
      if (deleteError) {
        console.error('category_tags DELETE error:', deleteError);
      }
    }

    // Add new tags
    for (const tagName of tagsToAdd) {
      const tagResult = await getOrCreateTag(tagName, userId);
      if (tagResult.ok) {
        const { error: insertError } = await supabase
          .from('category_tags')
          .insert({
            category_uid: categoryUid,
            tag_uid: tagResult.uid,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('category_tags INSERT error:', insertError);
        }
      }
    }

    console.log('Category tags synced:', { added: tagsToAdd.length, removed: tagsToRemove.length });
    return { ok: true };
  } catch (err) {
    console.error('Category tags sync exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * ==========================================
 * USER STORAGE
 * ==========================================
 */

/**
 * Update user storage after upload
 */
export async function updateUserStorage(userId, bytesAdded) {
  try {
    // Get current storage
    const { data: current } = await supabase
      .from('user_storage')
      .select('uid, current_storage')
      .eq('user_id', userId)
      .single();

    if (current) {
      // Update existing record
      const { error } = await supabase
        .from('user_storage')
        .update({
          current_storage: current.current_storage + bytesAdded,
        })
        .eq('uid', current.uid);

      if (error) {
        console.error('Storage update error:', error);
        return { ok: false, error: error.message };
      }
    } else {
      // Create new record (default 5GB max)
      const { error } = await supabase
        .from('user_storage')
        .insert({
          user_id: userId,
          current_storage: bytesAdded,
          maximum_storage: 5 * 1024 * 1024 * 1024, // 5GB default
          storage_tier: 0,
        });

      if (error) {
        console.error('Storage create error:', error);
        return { ok: false, error: error.message };
      }
    }

    console.log('User storage updated:', bytesAdded, 'bytes added');
    return { ok: true };
  } catch (err) {
    console.error('Storage update exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Get user's current storage usage
 */
export async function getUserStorage(userId) {
  try {
    const { data, error } = await supabase
      .from('user_storage')
      .select('current_storage, maximum_storage, storage_tier')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      currentStorage: data?.current_storage || 0,
      maximumStorage: data?.maximum_storage || 5 * 1024 * 1024 * 1024,
      storageTier: data?.storage_tier || 0,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}


/**
 * ==========================================
 * CLOUD PULL - Full data fetch for cross-device sync
 * ==========================================
 */

/**
 * Fetch all user data from Supabase for cross-device sync.
 * Returns categories, images, and tags structured for local consumption.
 */
export async function fetchFullCloudData(userId) {
  try {
    // Fetch all categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (catError) {
      console.error('Cloud pull: categories fetch error:', catError);
      return { ok: false, error: catError.message };
    }

    if (!categories || categories.length === 0) {
      console.log('Cloud pull: no categories found in Supabase');
      return { ok: true, categories: [], images: [], imageTagsLookup: {} };
    }

    // Fetch all images for this user
    const { data: images, error: imgError } = await supabase
      .from('images')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (imgError) {
      console.error('Cloud pull: images fetch error:', imgError);
      return { ok: false, error: imgError.message };
    }

    // Fetch all tags for this user
    const { data: tags, error: tagError } = await supabase
      .from('tags')
      .select('uid, name')
      .eq('user_id', userId);

    if (tagError) {
      console.warn('Cloud pull: tags fetch error:', tagError);
    }

    // Build tag UID → name lookup
    const tagLookup = {};
    for (const tag of (tags || [])) {
      tagLookup[tag.uid] = tag.name;
    }

    // Fetch all image_tags entries for the user's images
    const imageUids = (images || []).map(img => img.uid);
    let allImageTags = [];

    if (imageUids.length > 0) {
      // Fetch in batches of 100 to avoid query limits
      for (let i = 0; i < imageUids.length; i += 100) {
        const batch = imageUids.slice(i, i + 100);
        const { data: itBatch, error: itError } = await supabase
          .from('image_tags')
          .select('image_uid, tag_uid')
          .in('image_uid', batch);

        if (itError) {
          console.warn('Cloud pull: image_tags batch fetch error:', itError);
        } else {
          allImageTags = allImageTags.concat(itBatch || []);
        }
      }
    }

    // Build image UID → tag names lookup
    const imageTagsLookup = {};
    for (const it of allImageTags) {
      if (!imageTagsLookup[it.image_uid]) {
        imageTagsLookup[it.image_uid] = [];
      }
      const tagName = tagLookup[it.tag_uid];
      if (tagName) {
        imageTagsLookup[it.image_uid].push(tagName);
      }
    }

    console.log(`Cloud pull complete: ${categories.length} categories, ${(images || []).length} images, ${allImageTags.length} image-tag links`);
    return {
      ok: true,
      categories: categories || [],
      images: images || [],
      imageTagsLookup,
    };
  } catch (err) {
    console.error('Cloud pull exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * ==========================================
 * HYDRATION - Backfill Supabase UIDs on local data
 * ==========================================
 */

/**
 * Fetch all categories from Supabase for this user and return them
 * so the app can match them to local categories by name.
 */
export async function fetchSupabaseCategories(userId) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('uid, name')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.error('Fetch categories error:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, categories: data || [] };
  } catch (err) {
    console.error('Fetch categories exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Fetch all images for a category from Supabase
 * Used for hydration - backfilling supabaseUid on local image objects.
 */
export async function fetchSupabaseImages(categoryUid, userId) {
  try {
    const { data, error } = await supabase
      .from('images')
      .select('uid, r2_key, name')
      .eq('category_uid', categoryUid)
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.error('Fetch images error:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, images: data || [] };
  } catch (err) {
    console.error('Fetch images exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * ==========================================
 * LEGACY COMPATIBILITY (for existing code)
 * ==========================================
 */

/**
 * ==========================================
 * BATCH CLEANUP - Purge soft-deleted records and R2 files
 * ==========================================
 */

/**
 * Run batch cleanup: find all soft-deleted images and categories,
 * delete their R2 files, remove associated tags, hard-delete the
 * records, and reclaim storage.
 *
 * @param {string} userId - The user's ID
 * @param {string} accessToken - Supabase session access token (for R2 auth)
 * @param {Function} deleteR2File - Function to delete an R2 file: (r2Key, accessToken) => Promise
 * @returns {Promise<{ok: boolean, deletedImages: number, deletedCategories: number, freedBytes: number, errors: string[]}>}
 */
export async function runCleanup(userId, accessToken, deleteR2File) {
  const errors = [];
  let deletedImages = 0;
  let deletedCategories = 0;
  let freedBytes = 0;

  try {
    // ---- Step 1: Find all soft-deleted images ----
    const { data: deletedImgs, error: imgFetchErr } = await supabase
      .from('images')
      .select('uid, r2_key, image_size')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null);

    if (imgFetchErr) {
      errors.push('Failed to fetch deleted images: ' + imgFetchErr.message);
    }

    const imagesToClean = deletedImgs || [];
    console.log(`Cleanup: found ${imagesToClean.length} soft-deleted images`);

    for (const img of imagesToClean) {
      // Delete R2 file
      if (img.r2_key && deleteR2File) {
        const r2Result = await deleteR2File(img.r2_key, accessToken);
        if (!r2Result.ok) {
          errors.push(`R2 delete failed for ${img.r2_key}: ${r2Result.error}`);
        } else {
          console.log(`Cleanup: deleted R2 file ${img.r2_key}`);
        }
      }

      // Delete image_tags entries for this image
      const { error: itDeleteErr } = await supabase
        .from('image_tags')
        .delete()
        .eq('image_uid', img.uid);

      if (itDeleteErr) {
        errors.push(`image_tags cleanup failed for image ${img.uid}: ${itDeleteErr.message}`);
      }

      // Hard-delete the image record
      const { error: imgDeleteErr } = await supabase
        .from('images')
        .delete()
        .eq('uid', img.uid)
        .eq('user_id', userId);

      if (imgDeleteErr) {
        errors.push(`Image hard-delete failed for ${img.uid}: ${imgDeleteErr.message}`);
      } else {
        deletedImages++;
        freedBytes += img.image_size || 0;
      }
    }

    // ---- Step 2: Find all soft-deleted categories ----
    const { data: deletedCats, error: catFetchErr } = await supabase
      .from('categories')
      .select('uid')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null);

    if (catFetchErr) {
      errors.push('Failed to fetch deleted categories: ' + catFetchErr.message);
    }

    const categoriesToClean = deletedCats || [];
    console.log(`Cleanup: found ${categoriesToClean.length} soft-deleted categories`);

    for (const cat of categoriesToClean) {
      // Delete category_tags entries
      const { error: ctDeleteErr } = await supabase
        .from('category_tags')
        .delete()
        .eq('category_uid', cat.uid);

      if (ctDeleteErr) {
        errors.push(`category_tags cleanup failed for category ${cat.uid}: ${ctDeleteErr.message}`);
      }

      // Hard-delete the category record
      const { error: catDeleteErr } = await supabase
        .from('categories')
        .delete()
        .eq('uid', cat.uid)
        .eq('user_id', userId);

      if (catDeleteErr) {
        errors.push(`Category hard-delete failed for ${cat.uid}: ${catDeleteErr.message}`);
      } else {
        deletedCategories++;
      }
    }

    // ---- Step 3: Reclaim storage ----
    if (freedBytes > 0) {
      const { data: storageData } = await supabase
        .from('user_storage')
        .select('uid, current_storage')
        .eq('user_id', userId)
        .single();

      if (storageData) {
        const newStorage = Math.max(0, (storageData.current_storage || 0) - freedBytes);
        await supabase
          .from('user_storage')
          .update({ current_storage: newStorage })
          .eq('uid', storageData.uid);

        console.log(`Cleanup: reclaimed ${freedBytes} bytes, new storage: ${newStorage}`);
      }
    }

    // ---- Step 4: Clean up orphaned tags (no image_tags or category_tags referencing them) ----
    const { data: userTags } = await supabase
      .from('tags')
      .select('uid')
      .eq('user_id', userId);

    if (userTags && userTags.length > 0) {
      for (const tag of userTags) {
        const { data: itRefs } = await supabase
          .from('image_tags')
          .select('uid')
          .eq('tag_uid', tag.uid)
          .limit(1);

        const { data: ctRefs } = await supabase
          .from('category_tags')
          .select('uid')
          .eq('tag_uid', tag.uid)
          .limit(1);

        if ((!itRefs || itRefs.length === 0) && (!ctRefs || ctRefs.length === 0)) {
          await supabase
            .from('tags')
            .delete()
            .eq('uid', tag.uid)
            .eq('user_id', userId);
        }
      }
    }

    console.log(`Cleanup complete: ${deletedImages} images, ${deletedCategories} categories, ${freedBytes} bytes freed, ${errors.length} errors`);

    return { ok: true, deletedImages, deletedCategories, freedBytes, errors };
  } catch (err) {
    console.error('Cleanup exception:', err);
    return { ok: false, deletedImages, deletedCategories, freedBytes, errors: [...errors, err.message] };
  }
}

// Keep old function names working during migration
export const syncImageMetadata = updateImage;
export const syncImageDeletion = async (r2Key, userId) => {
  const found = await findImageByR2Key(r2Key, userId);
  if (found.ok) {
    return deleteImage(found.uid, userId);
  }
  return found;
};
