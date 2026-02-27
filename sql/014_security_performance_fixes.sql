-- ============================================
-- 014: Security & Performance Fixes
-- ============================================
-- Addresses Supabase Dashboard advisors:
--
-- SECURITY:
--   1. SECURITY DEFINER functions missing SET search_path
--   2. Overly permissive RLS policies (WITH CHECK (true))
--   3. IN (SELECT) policies rewritten as EXISTS for correctness
--
-- PERFORMANCE:
--   4. Missing indexes on foreign key columns
--   5. Composite/partial indexes for common query patterns
--
-- Run in Supabase SQL Editor.
-- ============================================


-- ============================================
-- 1. SECURITY DEFINER FUNCTIONS: Add search_path
-- ============================================
-- Supabase Security Advisor flags SECURITY DEFINER functions
-- without SET search_path as vulnerable to search_path hijacking.

-- 1a. Fix is_admin()
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_storage WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- 1b. Fix create_user_storage()
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;


-- ============================================
-- 2. TIGHTEN OVERLY PERMISSIVE RLS POLICIES
-- ============================================

-- 2a. notifications INSERT
-- Before: WITH CHECK (true) — anyone could spam notifications for any user
-- After:  user_id must match the owner_id of the referenced shared_gallery_id
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
CREATE POLICY "Notifications for gallery owners only"
  ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.owner_id = user_id
    )
  );

-- 2b. share_favorites INSERT
-- Before: WITH CHECK (true) — could insert favorites with arbitrary viewer_ids
-- After:  viewer_id must reference a viewer registered in that shared gallery
DROP POLICY IF EXISTS "Viewers can add favorites" ON share_favorites;
CREATE POLICY "Viewers can add favorites"
  ON share_favorites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM share_viewers sv
      WHERE sv.id = viewer_id
      AND sv.shared_gallery_id = shared_gallery_id
    )
  );

-- 2c. share_favorites DELETE
-- Before: USING (true) — anyone could delete anyone's favorites
-- After:  viewer_id must belong to the shared gallery
DROP POLICY IF EXISTS "Viewers can remove their own favorites" ON share_favorites;
CREATE POLICY "Viewers can remove their own favorites"
  ON share_favorites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM share_viewers sv
      WHERE sv.id = viewer_id
      AND sv.shared_gallery_id = shared_gallery_id
    )
  );


-- ============================================
-- 3. OPTIMIZE RLS POLICIES: IN (SELECT) → EXISTS
-- ============================================
-- EXISTS short-circuits on first match; IN materializes the full subquery.

-- 3a. share_access_log: Owners can read access logs
DROP POLICY IF EXISTS "Owners can read access logs" ON share_access_log;
CREATE POLICY "Owners can read access logs"
  ON share_access_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );

-- 3b. share_comments: Viewers can add comments
DROP POLICY IF EXISTS "Viewers can add comments" ON share_comments;
CREATE POLICY "Viewers can add comments"
  ON share_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.allow_comments = true
      AND sg.is_active = true
    )
  );

-- 3c. share_comments: Anyone can read comments on active galleries
DROP POLICY IF EXISTS "Anyone can read comments" ON share_comments;
CREATE POLICY "Anyone can read comments"
  ON share_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.is_active = true
    )
  );

-- 3d. share_comments: Owners can delete comments on their galleries
DROP POLICY IF EXISTS "Owners can delete comments on their galleries" ON share_comments;
CREATE POLICY "Owners can delete comments on their galleries"
  ON share_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );


-- ============================================
-- 4. MISSING INDEXES ON FOREIGN KEY COLUMNS
-- ============================================
-- PostgreSQL does NOT auto-create indexes on FK referencing columns.
-- Without them, ON DELETE CASCADE and FK constraint checks trigger
-- full table scans.

-- 4a. Core tables
CREATE INDEX IF NOT EXISTS idx_categories_user_id
  ON categories(user_id);

CREATE INDEX IF NOT EXISTS idx_images_user_id
  ON images(user_id);

CREATE INDEX IF NOT EXISTS idx_images_category_uid
  ON images(category_uid);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON user_settings(user_id);

-- 4b. Tag junction tables (UNIQUE covers first column only)
-- UNIQUE(image_uid, tag_uid) doesn't help queries filtering by tag_uid alone
CREATE INDEX IF NOT EXISTS idx_image_tags_tag_uid
  ON image_tags(tag_uid);

CREATE INDEX IF NOT EXISTS idx_category_tags_tag_uid
  ON category_tags(tag_uid);

-- 4c. Sharing / notification tables
CREATE INDEX IF NOT EXISTS idx_share_comments_owner_id
  ON share_comments(owner_id)
  WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_viewer_id
  ON notifications(viewer_id)
  WHERE viewer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_gallery
  ON notification_preferences(shared_gallery_id)
  WHERE shared_gallery_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_storage_tier
  ON user_storage(storage_tier);


-- ============================================
-- 5. COMPOSITE / PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================

-- 5a. Active (non-deleted) records — used by cloud pull, category listing
CREATE INDEX IF NOT EXISTS idx_categories_user_active
  ON categories(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_images_user_active
  ON images(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_images_category_active
  ON images(category_uid)
  WHERE deleted_at IS NULL;

-- 5b. Image lookup by r2_key (used in findImageByR2Key, deduplication)
CREATE INDEX IF NOT EXISTS idx_images_r2_key
  ON images(r2_key)
  WHERE r2_key IS NOT NULL AND deleted_at IS NULL;

-- 5c. Access log filtered by action (activity summary counts 'view_gallery')
CREATE INDEX IF NOT EXISTS idx_share_access_log_action
  ON share_access_log(shared_gallery_id, action);

-- 5d. Active shares per owner (owner dashboard queries)
CREATE INDEX IF NOT EXISTS idx_shared_galleries_owner_active
  ON shared_galleries(owner_id)
  WHERE is_active = true;

-- 5e. Expired share cleanup (cleanup-expired-shares edge function)
CREATE INDEX IF NOT EXISTS idx_shared_galleries_expires
  ON shared_galleries(expires_at)
  WHERE is_active = true AND expires_at IS NOT NULL;
