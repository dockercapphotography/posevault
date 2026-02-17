import { supabase } from '../supabaseClient';
import { hashPassword, verifyPassword } from './crypto';

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
      allowComments: data.allow_comments,
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
export async function getOrCreateViewer(sharedGalleryId, displayName) {
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
