import { supabase } from '../supabaseClient';
import { hashPassword, verifyPassword } from './crypto';
import { updateUserStorage } from './supabaseSync';

const R2_WORKER_URL = 'https://r2-worker.sitranephotography.workers.dev';

/**
 * Generate a URL-safe share token
 */
function generateShareToken() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// ==========================================
// Owner-facing operations (authenticated)
// ==========================================

/**
 * Create a new share link for a gallery
 */
export async function createShareLink(galleryUid, ownerId) {
  const shareToken = generateShareToken();

  const { data, error } = await supabase
    .from('shared_galleries')
    .insert({
      gallery_id: galleryUid,
      owner_id: ownerId,
      share_token: shareToken,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create share link:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, data, shareUrl: `${window.location.origin}/share/${shareToken}` };
}

/**
 * Get existing share config for a gallery (owner only)
 */
export async function getShareConfig(galleryUid) {
  const { data, error } = await supabase
    .from('shared_galleries')
    .select('*')
    .eq('gallery_id', galleryUid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to get share config:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

/**
 * Update share config (password, expiration, active status, etc.)
 */
export async function updateShareConfig(shareId, updates) {
  const { data, error } = await supabase
    .from('shared_galleries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', shareId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update share config:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

/**
 * Set or update the password on a shared gallery
 */
export async function setSharePassword(shareId, password) {
  const passwordHash = password ? await hashPassword(password) : null;
  return updateShareConfig(shareId, { password_hash: passwordHash });
}

/**
 * Deactivate a share link
 */
export async function deactivateShare(shareId) {
  return updateShareConfig(shareId, { is_active: false });
}

/**
 * Reactivate a share link
 */
export async function reactivateShare(shareId) {
  return updateShareConfig(shareId, { is_active: true });
}

/**
 * Delete a share link permanently
 */
export async function deleteShareLink(shareId) {
  const { error } = await supabase
    .from('shared_galleries')
    .delete()
    .eq('id', shareId);

  if (error) {
    console.error('Failed to delete share link:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Regenerate share token (invalidates old link)
 */
export async function regenerateShareToken(shareId) {
  const newToken = generateShareToken();
  const result = await updateShareConfig(shareId, { share_token: newToken });
  if (result.ok) {
    result.shareUrl = `${window.location.origin}/share/${newToken}`;
  }
  return result;
}

// ==========================================
// Viewer-facing operations (unauthenticated)
// ==========================================

/**
 * Validate a share token and get gallery metadata.
 * Returns share config (without images) for the token.
 */
export async function validateShareToken(token) {
  const { data, error } = await supabase
    .from('shared_galleries')
    .select('*')
    .eq('share_token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Share validation error:', error);
    return { ok: false, error: 'not_found' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { ok: false, error: 'share_expired' };
  }

  // Check if password is required
  const needsPassword = !!data.password_hash;

  return {
    ok: true,
    data: {
      id: data.id,
      galleryId: data.gallery_id,
      ownerId: data.owner_id,
      needsPassword,
      allowFavorites: data.allow_favorites,
      favoritesVisibleToOthers: data.favorites_visible_to_others,
      allowUploads: data.allow_uploads,
      requireUploadApproval: data.require_upload_approval,
      maxUploadsPerViewer: data.max_uploads_per_viewer,
      maxUploadSizeMb: data.max_upload_size_mb,
      allowComments: data.allow_comments,
      requireEmail: data.require_email,
      expiresAt: data.expires_at || null,
    },
  };
}

/**
 * Verify password for a password-protected share
 */
export async function verifySharePassword(token, password) {
  const { data, error } = await supabase
    .from('shared_galleries')
    .select('password_hash')
    .eq('share_token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: 'not_found' };
  }

  const isValid = await verifyPassword(password, data.password_hash);
  if (!isValid) {
    return { ok: false, error: 'password_incorrect' };
  }

  return { ok: true };
}

/**
 * Fetch the gallery data for a shared gallery viewer.
 * Uses the R2 worker's /share-image endpoint for images.
 */
export async function fetchSharedGalleryData(token, galleryId, ownerId) {
  // Fetch gallery info from categories table via edge function or direct query
  // Since the viewer is unauthenticated, we need to use the share-image endpoint
  // on the R2 worker to get images. First, get gallery metadata.

  // We can't directly query categories (RLS blocks it for anon users).
  // Instead, call the validate-share-access edge function which uses service role.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  try {
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${supabaseUrl}/functions/v1/validate-share-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, data: result.data };
  } catch (err) {
    console.error('Failed to fetch shared gallery data:', err);
    return { ok: false, error: 'fetch_failed' };
  }
}

/**
 * Create or retrieve a viewer session
 */
export async function getOrCreateViewer(sharedGalleryId, displayName, email = null) {
  // Check for existing session in localStorage
  const storageKey = `share_session_${sharedGalleryId}`;
  const existingSessionId = localStorage.getItem(storageKey);

  if (existingSessionId) {
    // Verify the session still exists
    const { data } = await supabase
      .from('share_viewers')
      .select('*')
      .eq('session_id', existingSessionId)
      .maybeSingle();

    if (data) {
      return { ok: true, data, isReturning: true };
    }
    // Session was deleted, clear localStorage
    localStorage.removeItem(storageKey);
  }

  // Create a new session
  const sessionId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
  const { data, error } = await supabase
    .from('share_viewers')
    .insert({
      shared_gallery_id: sharedGalleryId,
      session_id: sessionId,
      display_name: displayName,
      ...(email ? { email } : {}),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create viewer session:', error);
    return { ok: false, error: error.message };
  }

  // Store session ID for return visits
  localStorage.setItem(storageKey, sessionId);

  return { ok: true, data, isReturning: false };
}

/**
 * Check if viewer has an existing session for a shared gallery
 */
export async function checkExistingSession(sharedGalleryId) {
  const storageKey = `share_session_${sharedGalleryId}`;
  const existingSessionId = localStorage.getItem(storageKey);

  if (!existingSessionId) {
    return { ok: false };
  }

  const { data } = await supabase
    .from('share_viewers')
    .select('*')
    .eq('session_id', existingSessionId)
    .maybeSingle();

  if (!data) {
    localStorage.removeItem(storageKey);
    return { ok: false };
  }

  return { ok: true, data };
}

/**
 * Log an access event
 */
export async function logShareAccess(sharedGalleryId, viewerId, action, imageId = null) {
  const { error } = await supabase
    .from('share_access_log')
    .insert({
      shared_gallery_id: sharedGalleryId,
      viewer_id: viewerId,
      action,
      image_id: imageId,
    });

  if (error) {
    console.error('Failed to log share access:', error);
  }
}

/**
 * Get the R2 image URL for a shared gallery image.
 * Uses the share-image endpoint on the R2 worker.
 */
export function getShareImageUrl(token, r2Key) {
  return `${R2_WORKER_URL}/share-image?token=${encodeURIComponent(token)}&key=${encodeURIComponent(r2Key)}`;
}

/**
 * Get approved uploads for a gallery (owner-side).
 * Fetches the share config + approved uploads, returning image-ready objects.
 * @param {number|string} galleryUid - The gallery's supabaseUid
 * @returns {Promise<{ok: boolean, uploads?: Array, shareToken?: string, error?: string}>}
 */
export async function getApprovedUploadsForGallery(galleryUid) {
  // First get the share config
  const configResult = await getShareConfig(galleryUid);
  if (!configResult.ok || !configResult.data) {
    return { ok: true, uploads: [], favoriteCounts: {}, commentCounts: {} }; // No share = no data
  }

  const config = configResult.data;

  // Fetch viewer favorite counts (always, regardless of uploads setting)
  let favoriteCounts = {};
  if (config.allow_favorites) {
    const countsResult = await getAllFavoriteCounts(config.id);
    if (countsResult.ok) {
      favoriteCounts = countsResult.counts;
    }
  }

  // Always fetch comment counts — owner can comment regardless of allow_comments
  let commentCounts = {};
  const commentCountsResult = await getCommentCounts(config.id);
  if (commentCountsResult.ok) {
    commentCounts = commentCountsResult.counts;
  }

  if (!config.allow_uploads) {
    return { ok: true, uploads: [], favoriteCounts, commentCounts, shareToken: config.share_token, sharedGalleryId: config.id };
  }

  // Fetch approved uploads
  const { data, error } = await supabase
    .from('share_uploads')
    .select('*, share_viewers(display_name)')
    .eq('shared_gallery_id', config.id)
    .eq('approved', true)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch approved uploads for gallery:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, uploads: data || [], favoriteCounts, commentCounts, shareToken: config.share_token, sharedGalleryId: config.id };
}

// ==========================================
// Upload operations
// ==========================================

/**
 * Upload an image to a shared gallery via the R2 worker's share-upload endpoint.
 * @param {string} token - Share token for authentication
 * @param {string} sharedGalleryId - The shared gallery UUID
 * @param {string} viewerId - The viewer UUID
 * @param {File} file - The image file to upload
 * @param {number} maxSizeMb - Max file size in MB (from share config)
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
export async function uploadToSharedGallery(token, sharedGalleryId, viewerId, file, maxSizeMb = 10) {
  // Client-side file size check
  const fileSizeBytes = file.size;
  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  if (fileSizeBytes > maxSizeBytes) {
    return { ok: false, error: `File exceeds ${maxSizeMb}MB limit` };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('shared_gallery_id', sharedGalleryId);
    formData.append('viewer_id', viewerId);

    const response = await fetch(`${R2_WORKER_URL}/share-upload?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return { ok: false, error: result.error || 'Upload failed' };
    }

    return { ok: true, data: result.data };
  } catch (err) {
    console.error('Share upload error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Get all uploads for a shared gallery.
 * If requireApproval is true, only approved uploads are returned for viewers.
 * @param {string} sharedGalleryId - The shared gallery UUID
 * @param {boolean} approvedOnly - If true, only return approved uploads
 * @returns {Promise<{ok: boolean, uploads?: Array, error?: string}>}
 */
export async function getShareUploads(sharedGalleryId, approvedOnly = true) {
  let query = supabase
    .from('share_uploads')
    .select('*, share_viewers(display_name)')
    .eq('shared_gallery_id', sharedGalleryId)
    .order('uploaded_at', { ascending: false });

  if (approvedOnly) {
    query = query.eq('approved', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch share uploads:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, uploads: data };
}

/**
 * Get pending (unapproved) uploads for a shared gallery (owner view).
 * @param {string} sharedGalleryId - The shared gallery UUID
 * @returns {Promise<{ok: boolean, uploads?: Array, error?: string}>}
 */
export async function getPendingUploads(sharedGalleryId) {
  const { data, error } = await supabase
    .from('share_uploads')
    .select('*, share_viewers(display_name)')
    .eq('shared_gallery_id', sharedGalleryId)
    .eq('approved', false)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending uploads:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, uploads: data };
}

/**
 * Get the total upload count for a specific viewer (approved + pending).
 * Used for client-side pre-validation of max_uploads_per_viewer.
 */
export async function getViewerUploadCount(sharedGalleryId, viewerId) {
  const { count, error } = await supabase
    .from('share_uploads')
    .select('id', { count: 'exact', head: true })
    .eq('shared_gallery_id', sharedGalleryId)
    .eq('viewer_id', viewerId);

  if (error) {
    console.error('Failed to get viewer upload count:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Approve an upload (owner only).
 * @param {string} uploadId - The upload UUID
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function approveUpload(uploadId) {
  const { error } = await supabase
    .from('share_uploads')
    .update({ approved: true })
    .eq('id', uploadId);

  if (error) {
    console.error('Failed to approve upload:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Update share upload metadata (owner only).
 * Supports: display_name, notes, tags, is_favorite.
 * @param {string} uploadId - The upload UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function updateShareUpload(uploadId, updates) {
  const allowed = {};
  if (updates.display_name !== undefined) allowed.display_name = updates.display_name;
  if (updates.notes !== undefined) allowed.notes = updates.notes;
  if (updates.tags !== undefined) allowed.tags = updates.tags;
  if (updates.is_favorite !== undefined) allowed.is_favorite = updates.is_favorite;

  const { error } = await supabase
    .from('share_uploads')
    .update(allowed)
    .eq('id', uploadId);

  if (error) {
    console.error('Failed to update share upload:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Reject (delete) an upload (owner only).
 * Also deletes the image from R2 via the worker and reclaims storage.
 * @param {string} uploadId - The upload UUID
 * @param {string} imageUrl - The R2 key to delete
 * @param {string} accessToken - Owner's Supabase access token
 * @param {string} ownerId - The gallery owner's user ID (for storage reclamation)
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function rejectUpload(uploadId, imageUrl, accessToken, ownerId) {
  // Read file_size from DB before deleting the record
  let fileSize = 0;
  const { data: upload } = await supabase
    .from('share_uploads')
    .select('file_size')
    .eq('id', uploadId)
    .maybeSingle();
  if (upload?.file_size) fileSize = upload.file_size;

  // Delete from R2
  if (imageUrl) {
    try {
      await fetch(`${R2_WORKER_URL}/${imageUrl}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      console.error('Failed to delete rejected upload from R2:', err);
    }
  }

  // Delete from DB
  const { error } = await supabase
    .from('share_uploads')
    .delete()
    .eq('id', uploadId);

  if (error) {
    console.error('Failed to reject upload:', error);
    return { ok: false, error: error.message };
  }

  // Reclaim storage from owner
  if (fileSize > 0 && ownerId) {
    updateUserStorage(ownerId, -fileSize);
  }

  return { ok: true };
}

/**
 * Get approved share upload counts and favorite counts for all galleries owned by a user.
 * Returns a map of galleryUid → { uploadCount, favoriteCount }
 */
export async function getShareStatsForOwner(ownerId) {
  // Get all shared galleries for this owner
  const { data: shares, error: sharesError } = await supabase
    .from('shared_galleries')
    .select('id, gallery_id')
    .eq('owner_id', ownerId)
    .eq('is_active', true);

  if (sharesError || !shares || shares.length === 0) {
    return { ok: true, stats: {} };
  }

  const shareIds = shares.map(s => s.id);

  // Fetch approved upload counts
  const { data: uploads, error: uploadsError } = await supabase
    .from('share_uploads')
    .select('shared_gallery_id')
    .in('shared_gallery_id', shareIds)
    .eq('approved', true);

  // Fetch favorite counts on share uploads (owner favorites)
  const { data: favUploads, error: favError } = await supabase
    .from('share_uploads')
    .select('shared_gallery_id, is_favorite')
    .in('shared_gallery_id', shareIds)
    .eq('approved', true)
    .eq('is_favorite', true);

  if (uploadsError) {
    console.error('Failed to fetch share upload counts:', uploadsError);
    return { ok: false, error: uploadsError.message };
  }

  // Build a shareId → galleryUid lookup
  const shareToGallery = {};
  for (const s of shares) {
    shareToGallery[s.id] = s.gallery_id;
  }

  // Aggregate counts by galleryUid
  const stats = {};
  for (const u of (uploads || [])) {
    const galleryUid = shareToGallery[u.shared_gallery_id];
    if (!stats[galleryUid]) stats[galleryUid] = { uploadCount: 0, favoriteCount: 0 };
    stats[galleryUid].uploadCount++;
  }
  for (const f of (favUploads || [])) {
    const galleryUid = shareToGallery[f.shared_gallery_id];
    if (!stats[galleryUid]) stats[galleryUid] = { uploadCount: 0, favoriteCount: 0 };
    stats[galleryUid].favoriteCount++;
  }

  return { ok: true, stats };
}

// ==========================================
// Favorites operations
// ==========================================

/**
 * Toggle a favorite for a viewer on a shared gallery image.
 * Returns { ok, isFavorite } indicating the new state.
 */
export async function toggleShareFavorite(sharedGalleryId, imageId, viewerId) {
  // Check if already favorited
  const { data: existing } = await supabase
    .from('share_favorites')
    .select('id')
    .eq('shared_gallery_id', sharedGalleryId)
    .eq('image_id', imageId)
    .eq('viewer_id', viewerId)
    .maybeSingle();

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('share_favorites')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to remove favorite:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, isFavorite: false };
  } else {
    // Add favorite
    const { error } = await supabase
      .from('share_favorites')
      .insert({
        shared_gallery_id: sharedGalleryId,
        image_id: imageId,
        viewer_id: viewerId,
      });

    if (error) {
      console.error('Failed to add favorite:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, isFavorite: true };
  }
}

/**
 * Get all favorites for the current viewer on a shared gallery.
 * Returns a Set of image IDs.
 */
export async function getViewerFavorites(sharedGalleryId, viewerId) {
  const { data, error } = await supabase
    .from('share_favorites')
    .select('image_id')
    .eq('shared_gallery_id', sharedGalleryId)
    .eq('viewer_id', viewerId);

  if (error) {
    console.error('Failed to fetch viewer favorites:', error);
    return { ok: false, error: error.message };
  }

  const imageIds = new Set(data.map(f => f.image_id));
  return { ok: true, favorites: imageIds };
}

/**
 * Get all favorites across all viewers for a shared gallery.
 * Returns a map of imageId → count of unique viewers who favorited it.
 */
export async function getAllFavoriteCounts(sharedGalleryId) {
  const { data, error } = await supabase
    .from('share_favorites')
    .select('image_id, viewer_id')
    .eq('shared_gallery_id', sharedGalleryId);

  if (error) {
    console.error('Failed to fetch all favorites:', error);
    return { ok: false, error: error.message };
  }

  const counts = {};
  data.forEach(f => {
    counts[f.image_id] = (counts[f.image_id] || 0) + 1;
  });
  return { ok: true, counts };
}

// ==========================================
// Comment operations
// ==========================================

/**
 * Add a comment on an image in a shared gallery.
 * @param {string} sharedGalleryId - The shared gallery UUID
 * @param {string} imageId - The image ID (gallery image or upload-{id})
 * @param {string} viewerId - The viewer UUID
 * @param {string} commentText - The comment text
 * @returns {Promise<{ok: boolean, comment?: Object, error?: string}>}
 */
export async function addShareComment(sharedGalleryId, imageId, viewerId, commentText) {
  const { data, error } = await supabase
    .from('share_comments')
    .insert({
      shared_gallery_id: sharedGalleryId,
      image_id: imageId,
      viewer_id: viewerId,
      comment_text: commentText.trim(),
    })
    .select('*, share_viewers(display_name)')
    .single();

  if (error) {
    console.error('Failed to add comment:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, comment: data };
}

/**
 * Add a comment as the gallery owner.
 * @param {string} sharedGalleryId - The shared gallery UUID
 * @param {string} imageId - The image ID
 * @param {string} commentText - The comment text
 * @returns {Promise<{ok: boolean, comment?: Object, error?: string}>}
 */
export async function addOwnerComment(sharedGalleryId, imageId, commentText) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('share_comments')
    .insert({
      shared_gallery_id: sharedGalleryId,
      image_id: imageId,
      owner_id: user.id,
      comment_text: commentText.trim(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to add owner comment:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, comment: data };
}

/**
 * Get all comments for a specific image in a shared gallery.
 * @param {string} sharedGalleryId - The shared gallery UUID
 * @param {string} imageId - The image ID
 * @returns {Promise<{ok: boolean, comments?: Array, error?: string}>}
 */
export async function getCommentsForImage(sharedGalleryId, imageId) {
  const { data, error } = await supabase
    .from('share_comments')
    .select('*, share_viewers(display_name)')
    .eq('shared_gallery_id', sharedGalleryId)
    .eq('image_id', imageId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch comments:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, comments: data || [] };
}

/**
 * Get comment counts per image for a shared gallery.
 * Returns a map of imageId → count.
 * @param {string} sharedGalleryId - The shared gallery UUID
 * @returns {Promise<{ok: boolean, counts?: Object, error?: string}>}
 */
export async function getCommentCounts(sharedGalleryId) {
  const { data, error } = await supabase
    .from('share_comments')
    .select('image_id')
    .eq('shared_gallery_id', sharedGalleryId);

  if (error) {
    console.error('Failed to fetch comment counts:', error);
    return { ok: false, error: error.message };
  }

  const counts = {};
  (data || []).forEach(c => {
    counts[c.image_id] = (counts[c.image_id] || 0) + 1;
  });
  return { ok: true, counts };
}

/**
 * Delete a comment (viewer can delete own, owner can delete any).
 * @param {string} commentId - The comment UUID
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function deleteShareComment(commentId) {
  const { error } = await supabase
    .from('share_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Failed to delete comment:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
