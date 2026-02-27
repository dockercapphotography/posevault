-- ============================================
-- 014_rollback: Undo all changes from 014_security_performance_fixes.sql
-- ============================================
-- Run this in Supabase SQL Editor if anything breaks after applying 014.
-- Restores all original policies and drops new indexes.
-- ============================================


-- ============================================
-- 1. RESTORE ORIGINAL SECURITY DEFINER FUNCTIONS (remove SET search_path)
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_storage WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION create_user_storage()
RETURNS TRIGGER AS $$
DECLARE
  default_tier_id INT;
  default_bytes BIGINT;
BEGIN
  SELECT id, storage_bytes INTO default_tier_id, default_bytes
    FROM storage_tiers
    WHERE is_default = true
    LIMIT 1;

  IF default_tier_id IS NULL THEN
    default_tier_id := 1;
    default_bytes := 524288000;
  END IF;

  INSERT INTO user_storage (user_id, current_storage, maximum_storage, storage_tier)
  VALUES (NEW.id, 0, default_bytes, default_tier_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 2. RESTORE ORIGINAL RLS POLICIES
-- ============================================

-- 2a. notifications INSERT → restore wide-open policy (from 007)
DROP POLICY IF EXISTS "Notifications for gallery owners only" ON notifications;
CREATE POLICY "Anyone can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- 2b. share_favorites INSERT → restore wide-open policy (from 002)
DROP POLICY IF EXISTS "Viewers can add favorites" ON share_favorites;
CREATE POLICY "Viewers can add favorites"
  ON share_favorites
  FOR INSERT
  WITH CHECK (true);

-- 2c. share_favorites DELETE → restore wide-open policy (from 002)
DROP POLICY IF EXISTS "Viewers can remove their own favorites" ON share_favorites;
CREATE POLICY "Viewers can remove their own favorites"
  ON share_favorites
  FOR DELETE
  USING (true);


-- ============================================
-- 3. RESTORE ORIGINAL IN (SELECT) POLICIES
-- ============================================

-- 3a. share_access_log (from 001)
DROP POLICY IF EXISTS "Owners can read access logs" ON share_access_log;
CREATE POLICY "Owners can read access logs"
  ON share_access_log
  FOR SELECT
  USING (
    shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
    )
  );

-- 3b. share_comments: Viewers can add comments (from 005)
DROP POLICY IF EXISTS "Viewers can add comments" ON share_comments;
CREATE POLICY "Viewers can add comments"
  ON share_comments
  FOR INSERT
  WITH CHECK (
    shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE allow_comments = true AND is_active = true
    )
  );

-- 3c. share_comments: Anyone can read comments (from 005)
DROP POLICY IF EXISTS "Anyone can read comments" ON share_comments;
CREATE POLICY "Anyone can read comments"
  ON share_comments
  FOR SELECT
  USING (
    shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE is_active = true
    )
  );

-- 3d. share_comments: Owners can delete comments (from 005)
DROP POLICY IF EXISTS "Owners can delete comments on their galleries" ON share_comments;
CREATE POLICY "Owners can delete comments on their galleries"
  ON share_comments
  FOR DELETE
  USING (
    shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
    )
  );

-- 3e. share_comments: Owners can add comments (from 006)
DROP POLICY IF EXISTS "Owners can add comments on their galleries" ON share_comments;
CREATE POLICY "Owners can add comments on their galleries"
  ON share_comments
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
    )
  );


-- ============================================
-- 4. DROP NEW INDEXES (from section 4 of 014)
-- ============================================

DROP INDEX IF EXISTS idx_categories_user_id;
DROP INDEX IF EXISTS idx_images_user_id;
DROP INDEX IF EXISTS idx_images_category_uid;
DROP INDEX IF EXISTS idx_user_settings_user_id;
DROP INDEX IF EXISTS idx_image_tags_tag_uid;
DROP INDEX IF EXISTS idx_category_tags_tag_uid;
DROP INDEX IF EXISTS idx_share_comments_owner_id;
DROP INDEX IF EXISTS idx_notifications_viewer_id;
DROP INDEX IF EXISTS idx_notification_prefs_gallery;
DROP INDEX IF EXISTS idx_user_storage_tier;


-- ============================================
-- 5. DROP NEW COMPOSITE / PARTIAL INDEXES (from section 5 of 014)
-- ============================================

DROP INDEX IF EXISTS idx_categories_user_active;
DROP INDEX IF EXISTS idx_images_user_active;
DROP INDEX IF EXISTS idx_images_category_active;
DROP INDEX IF EXISTS idx_images_r2_key;
DROP INDEX IF EXISTS idx_share_access_log_action;
DROP INDEX IF EXISTS idx_shared_galleries_owner_active;
DROP INDEX IF EXISTS idx_shared_galleries_expires;
