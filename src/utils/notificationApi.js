import { supabase } from '../supabaseClient';

// ==========================================
// Notification CRUD (authenticated owner)
// ==========================================

/**
 * Fetch notifications for the current user.
 * @param {string} userId
 * @param {object} options - { limit, offset, unreadOnly }
 * @returns {Promise<{ok: boolean, notifications?: Array, total?: number, error?: string}>}
 */
export async function getNotifications(userId, { limit = 50, offset = 0, unreadOnly = false } = {}) {
  let query = supabase
    .from('notifications')
    .select('*, shared_galleries(share_token, gallery_id), share_viewers(display_name)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, notifications: data || [], total: count || 0 };
}

/**
 * Get unread notification count for the current user.
 * @param {string} userId
 * @returns {Promise<{ok: boolean, count?: number, error?: string}>}
 */
export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to fetch unread count:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, count: count || 0 };
}

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to mark notification as read:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Mark all notifications as read for a user.
 * @param {string} userId
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Delete a single notification.
 * @param {string} notificationId
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function deleteNotification(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to delete notification:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Clear all read notifications for a user.
 * @param {string} userId
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function clearReadNotifications(userId) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true);

  if (error) {
    console.error('Failed to clear read notifications:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ==========================================
// Create notification (called from viewer actions)
// ==========================================

/**
 * Create a notification for a gallery owner when a viewer performs an action.
 * Checks notification preferences before inserting.
 * @param {object} params
 * @param {string} params.sharedGalleryId
 * @param {string} params.ownerId - Gallery owner user ID
 * @param {string} params.type - 'view' | 'favorite' | 'upload_pending' | 'comment' | 'share_expired'
 * @param {string} params.message - Human-readable summary
 * @param {string} [params.viewerId] - Viewer UUID (nullable)
 * @param {string} [params.imageId] - Image ID (nullable)
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function createNotification({ sharedGalleryId, ownerId, type, message, viewerId = null, imageId = null }) {
  // Check if the owner has notification preferences
  const prefs = await getEffectivePreferences(ownerId, sharedGalleryId);

  // If quiet mode is on globally, skip all notifications
  if (prefs.quiet_mode) {
    return { ok: true, skipped: true };
  }

  // Check per-type preference
  const typeToField = {
    view: 'notify_on_view',
    favorite: 'notify_on_favorite',
    upload_pending: 'notify_on_upload',
    comment: 'notify_on_comment',
    share_expired: 'notify_on_expiry',
  };

  const prefField = typeToField[type];
  if (prefField && prefs[prefField] === false) {
    return { ok: true, skipped: true };
  }

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: ownerId,
      shared_gallery_id: sharedGalleryId,
      type,
      message,
      viewer_id: viewerId,
      image_id: imageId,
    });

  if (error) {
    console.error('Failed to create notification:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ==========================================
// Notification Preferences
// ==========================================

/**
 * Get notification preferences for a user.
 * Returns global prefs (shared_gallery_id = null) and per-share overrides.
 * @param {string} userId
 * @returns {Promise<{ok: boolean, global?: object, perShare?: Array, error?: string}>}
 */
export async function getNotificationPreferences(userId) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch notification preferences:', error);
    return { ok: false, error: error.message };
  }

  const global = (data || []).find(p => p.shared_gallery_id === null) || null;
  const perShare = (data || []).filter(p => p.shared_gallery_id !== null);

  return { ok: true, global, perShare };
}

/**
 * Get effective preferences for a specific shared gallery.
 * Falls back to global defaults if no per-share override exists.
 * @param {string} userId
 * @param {string} sharedGalleryId
 * @returns {Promise<object>} Resolved preferences object
 */
export async function getEffectivePreferences(userId, sharedGalleryId) {
  const defaults = {
    notify_on_view: false,
    notify_on_favorite: true,
    notify_on_upload: true,
    notify_on_comment: true,
    notify_on_expiry: true,
    quiet_mode: false,
  };

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .in('shared_gallery_id', [sharedGalleryId])
    .maybeSingle();

  if (!error && data) {
    return { ...defaults, ...data };
  }

  // Try global prefs
  const { data: globalData } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .is('shared_gallery_id', null)
    .maybeSingle();

  if (globalData) {
    return { ...defaults, ...globalData };
  }

  return defaults;
}

/**
 * Update or create notification preferences.
 * Uses manual select-then-update/insert because PostgreSQL UNIQUE constraints
 * treat NULLs as distinct, so upsert with onConflict fails when
 * shared_gallery_id is NULL (global preferences).
 * @param {string} userId
 * @param {string|null} sharedGalleryId - null for global prefs
 * @param {object} updates - Preference fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
export async function upsertNotificationPreferences(userId, sharedGalleryId, updates) {
  // Check if a row already exists for this user + gallery combination
  let query = supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', userId);

  if (sharedGalleryId === null) {
    query = query.is('shared_gallery_id', null);
  } else {
    query = query.eq('shared_gallery_id', sharedGalleryId);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    // Update the existing row
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update notification preferences:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, data };
  }

  // Insert a new row
  const { data, error } = await supabase
    .from('notification_preferences')
    .insert({
      user_id: userId,
      shared_gallery_id: sharedGalleryId,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to insert notification preferences:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

// ==========================================
// Activity Summary
// ==========================================

/**
 * Get activity summary for a shared gallery.
 * Aggregates from share_access_log, share_favorites, share_uploads, share_comments.
 * @param {string} sharedGalleryId
 * @returns {Promise<{ok: boolean, summary?: object, error?: string}>}
 */
export async function getActivitySummary(sharedGalleryId) {
  try {
    // Fetch all data in parallel
    const [viewersResult, favoritesResult, uploadsResult, commentsResult, accessLogResult] = await Promise.all([
      supabase
        .from('share_viewers')
        .select('id, display_name, email, created_at')
        .eq('shared_gallery_id', sharedGalleryId),
      supabase
        .from('share_favorites')
        .select('image_id, viewer_id')
        .eq('shared_gallery_id', sharedGalleryId),
      supabase
        .from('share_uploads')
        .select('id, approved, viewer_id, uploaded_at')
        .eq('shared_gallery_id', sharedGalleryId),
      supabase
        .from('share_comments')
        .select('id, image_id, viewer_id, created_at, comment_text, share_viewers(display_name)')
        .eq('shared_gallery_id', sharedGalleryId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('share_access_log')
        .select('id, action, accessed_at, viewer_id')
        .eq('shared_gallery_id', sharedGalleryId)
        .order('accessed_at', { ascending: false })
        .limit(100),
    ]);

    const viewers = viewersResult.data || [];
    const favorites = favoritesResult.data || [];
    const uploads = uploadsResult.data || [];
    const comments = commentsResult.data || [];
    const accessLog = accessLogResult.data || [];

    // Total views (count of 'view_gallery' actions in access log)
    const totalViews = accessLog.filter(l => l.action === 'view_gallery').length;

    // Unique viewers
    const uniqueViewers = viewers.length;

    // Most-favorited images (top 5)
    const favCounts = {};
    favorites.forEach(f => {
      favCounts[f.image_id] = (favCounts[f.image_id] || 0) + 1;
    });
    const mostFavoritedRaw = Object.entries(favCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Collect all image IDs from favorites and comments to resolve URLs
    const favImageIds = mostFavoritedRaw.map(([id]) => id);
    const commentImageIds = comments.map(c => c.image_id);
    const allImageIds = [...new Set([...favImageIds, ...commentImageIds])];

    // Separate into gallery images (numeric) and uploaded images (upload-{uuid})
    const numericIds = [];
    const uploadUuids = [];
    allImageIds.forEach(id => {
      if (typeof id === 'string' && id.startsWith('upload-')) {
        uploadUuids.push(id.replace('upload-', ''));
      } else {
        const num = Number(id);
        if (!isNaN(num)) numericIds.push(num);
      }
    });

    // Look up r2_key for gallery images and image_url for uploaded images in parallel
    let imageR2Keys = {};
    const lookups = [];

    if (numericIds.length > 0) {
      lookups.push(
        supabase
          .from('images')
          .select('uid, r2_key')
          .in('uid', numericIds)
          .then(({ data: imgData }) => {
            if (imgData) {
              imgData.forEach(img => { imageR2Keys[String(img.uid)] = img.r2_key; });
            }
          })
      );
    }

    if (uploadUuids.length > 0) {
      lookups.push(
        supabase
          .from('share_uploads')
          .select('id, image_url')
          .in('id', uploadUuids)
          .then(({ data: uploadData }) => {
            if (uploadData) {
              uploadData.forEach(u => { imageR2Keys[`upload-${u.id}`] = u.image_url; });
            }
          })
      );
    }

    await Promise.all(lookups);

    const mostFavorited = mostFavoritedRaw.map(([imageId, count]) => ({
      imageId,
      count,
      r2Key: imageR2Keys[imageId] || null,
    }));

    // Pending uploads
    const pendingUploads = uploads.filter(u => !u.approved).length;
    const approvedUploads = uploads.filter(u => u.approved).length;

    // Recent comments
    const recentComments = comments.map(c => ({
      id: c.id,
      imageId: c.image_id,
      viewerName: c.share_viewers?.display_name || 'Unknown',
      text: c.comment_text,
      createdAt: c.created_at,
      r2Key: imageR2Keys[c.image_id] || null,
    }));

    // Viewer list with activity
    const viewerList = viewers.map(v => {
      const viewerFavs = favorites.filter(f => f.viewer_id === v.id).length;
      const viewerUploads = uploads.filter(u => u.viewer_id === v.id).length;
      return {
        id: v.id,
        displayName: v.display_name,
        email: v.email || null,
        joinedAt: v.created_at,
        favoriteCount: viewerFavs,
        uploadCount: viewerUploads,
      };
    });

    return {
      ok: true,
      summary: {
        totalViews,
        uniqueViewers,
        mostFavorited,
        pendingUploads,
        approvedUploads,
        totalFavorites: favorites.length,
        totalComments: comments.length,
        recentComments,
        viewers: viewerList,
      },
    };
  } catch (err) {
    console.error('Failed to get activity summary:', err);
    return { ok: false, error: err.message };
  }
}
