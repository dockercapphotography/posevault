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
  try {
    // First, try to find existing tag
    const { data: existing } = await supabase
      .from('tags')
      .select('uid')
      .eq('name', tagName.toLowerCase().trim())
      .eq('user_id', userId)
      .single();

    if (existing) {
      return { ok: true, uid: existing.uid, created: false };
    }

    // Create new tag
    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: tagName.toLowerCase().trim(),
        user_id: userId,
      })
      .select('uid')
      .single();

    if (error) {
      console.error('Supabase tag create error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Tag created in Supabase:', tagName, data.uid);
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
    const { data: currentTags } = await supabase
      .from('image_tags')
      .select('uid, tag_uid, tags(name)')
      .eq('image_uid', imageUid);

    const currentTagNames = (currentTags || []).map(t => t.tags?.name);
    const newTagNames = tags.map(t => t.toLowerCase().trim());

    // Tags to add
    const tagsToAdd = newTagNames.filter(t => !currentTagNames.includes(t));

    // Tags to remove
    const tagsToRemove = (currentTags || []).filter(
      t => !newTagNames.includes(t.tags?.name)
    );

    // Remove old tags
    for (const tag of tagsToRemove) {
      await supabase
        .from('image_tags')
        .delete()
        .eq('uid', tag.uid);
    }

    // Add new tags
    for (const tagName of tagsToAdd) {
      const tagResult = await getOrCreateTag(tagName, userId);
      if (tagResult.ok) {
        await supabase
          .from('image_tags')
          .insert({
            image_uid: imageUid,
            tag_uid: tagResult.uid,
          });
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
    const { data: currentTags } = await supabase
      .from('category_tags')
      .select('uid, tag_uid, tags(name)')
      .eq('category_uid', categoryUid);

    const currentTagNames = (currentTags || []).map(t => t.tags?.name);
    const newTagNames = tags.map(t => t.toLowerCase().trim());

    // Tags to add
    const tagsToAdd = newTagNames.filter(t => !currentTagNames.includes(t));

    // Tags to remove
    const tagsToRemove = (currentTags || []).filter(
      t => !newTagNames.includes(t.tags?.name)
    );

    // Remove old tags
    for (const tag of tagsToRemove) {
      await supabase
        .from('category_tags')
        .delete()
        .eq('uid', tag.uid);
    }

    // Add new tags
    for (const tagName of tagsToAdd) {
      const tagResult = await getOrCreateTag(tagName, userId);
      if (tagResult.ok) {
        await supabase
          .from('category_tags')
          .insert({
            category_uid: categoryUid,
            tag_uid: tagResult.uid,
          });
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

// Keep old function names working during migration
export const syncImageMetadata = updateImage;
export const syncImageDeletion = async (r2Key, userId) => {
  const found = await findImageByR2Key(r2Key, userId);
  if (found.ok) {
    return deleteImage(found.uid, userId);
  }
  return found;
};
