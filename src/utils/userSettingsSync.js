import { supabase } from '../supabaseClient';

/**
 * Get a user setting by key
 */
export async function getUserSetting(userId, key) {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();  // Use maybeSingle() instead of single() - returns null if not found

    if (error) {
      console.error('Error fetching user setting:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, value: data?.value || null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Set a user setting (insert or update)
 */
export async function setUserSetting(userId, key, value) {
  try {
    // Try to find existing setting
    const { data: existing } = await supabase
      .from('user_settings')
      .select('uid')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();  // Use maybeSingle() instead of single()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('user_settings')
        .update({
          value: value,
          updated_at: new Date().toISOString()
        })
        .eq('uid', existing.uid);

      if (error) {
        return { ok: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          key: key,
          value: value
        });

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Update user profile (display name)
 */
export async function updateUserProfile(userId, updates) {
  try {
    // Split display name into firstName and lastName
    const nameParts = updates.displayName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const { error } = await supabase.auth.updateUser({
      data: {
        firstName: firstName,
        lastName: lastName
      }
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Update user email
 */
export async function updateUserEmail(newEmail) {
  try {
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Delete user account and all associated data
 * WARNING: This is irreversible!
 */
export async function deleteUserAccount(userId, accessToken, deleteFromR2) {
  const errors = [];
  let deletedImages = 0;
  let deletedCategories = 0;

  try {
    // Step 1: Get all user's images with R2 keys
    const { data: images, error: imgError } = await supabase
      .from('images')
      .select('uid, r2_key')
      .eq('user_id', userId);

    if (imgError) {
      errors.push('Failed to fetch images: ' + imgError.message);
    }

    // Step 2: Delete all images from R2
    if (images && deleteFromR2) {
      for (const img of images) {
        if (img.r2_key) {
          const result = await deleteFromR2(img.r2_key, accessToken);
          if (!result.ok) {
            errors.push(`R2 delete failed for ${img.r2_key}: ${result.error}`);
          } else {
            deletedImages++;
          }
        }
      }
    }

    // Step 3: Delete all database records (in order to respect foreign keys)
    
    // Delete image_tags
    const { error: imageTagsError } = await supabase
      .from('image_tags')
      .delete()
      .eq('user_id', userId);

    if (imageTagsError) {
      errors.push('Failed to delete image_tags: ' + imageTagsError.message);
    }

    // Delete images
    const { error: imagesError } = await supabase
      .from('images')
      .delete()
      .eq('user_id', userId);

    if (imagesError) {
      errors.push('Failed to delete images: ' + imagesError.message);
    }

    // Delete category_tags
    const { error: categoryTagsError } = await supabase
      .from('category_tags')
      .delete()
      .eq('user_id', userId);

    if (categoryTagsError) {
      errors.push('Failed to delete category_tags: ' + categoryTagsError.message);
    }

    // Delete categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('uid')
      .eq('user_id', userId);

    const { error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .eq('user_id', userId);

    if (categoriesError) {
      errors.push('Failed to delete categories: ' + categoriesError.message);
    } else {
      deletedCategories = categories?.length || 0;
    }

    // Delete tags
    const { error: tagsError } = await supabase
      .from('tags')
      .delete()
      .eq('user_id', userId);

    if (tagsError) {
      errors.push('Failed to delete tags: ' + tagsError.message);
    }

    // Delete user_storage
    const { error: storageError } = await supabase
      .from('user_storage')
      .delete()
      .eq('user_id', userId);

    if (storageError) {
      errors.push('Failed to delete user_storage: ' + storageError.message);
    }

    // Delete user_settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId);

    if (settingsError) {
      errors.push('Failed to delete user_settings: ' + settingsError.message);
    }

    // Step 4: Delete user from auth (this must be done via admin API or RPC)
    // Note: Supabase auth.deleteUser() only works on the server side
    // We'll need to create an RPC function for this
    const { error: deleteUserError } = await supabase.rpc('delete_user_account', {
      user_id_to_delete: userId
    });

    if (deleteUserError) {
      errors.push('Failed to delete user account: ' + deleteUserError.message);
    }

    console.log(`Account deletion complete: ${deletedImages} images from R2, ${deletedCategories} categories, ${errors.length} errors`);

    return {
      ok: errors.length === 0,
      deletedImages,
      deletedCategories,
      errors
    };
  } catch (err) {
    console.error('Account deletion exception:', err);
    return {
      ok: false,
      deletedImages,
      deletedCategories,
      errors: [...errors, err.message]
    };
  }
}
