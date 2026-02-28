-- =============================================
-- PoseVault — Migration 016: Performance Policy Fixes (Clean Slate)
-- Run in Supabase SQL Editor
-- =============================================
--
-- IMPORTANT: The database contains duplicate policies created outside
-- of migration files (via Supabase Dashboard). This migration drops
-- ALL policies on affected tables first, then creates exactly the
-- right set with proper (select auth.uid()) InitPlan wrapping and
-- no overlapping permissive policies.
--
-- Addresses:
--   auth_rls_initplan: wrap auth.uid() / current_setting() in (select ...)
--   multiple_permissive_policies: one policy per table+operation
--
-- =============================================

BEGIN;

-- =============================================
-- SECTION 1: categories — Drop ALL, create single FOR ALL
--
-- Current state has 5 overlapping policies:
--   "Users can manage own categories"        (FOR ALL)
--   "Users can delete their own categories"  (DELETE)
--   "Users can insert their own categories"  (INSERT)
--   "Users can view their own categories"    (SELECT)
--   "Users can update their own categories"  (UPDATE)
-- =============================================

DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;

CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 2: images — Drop ALL, create single FOR ALL
--
-- Same duplicate pattern as categories (5 policies)
-- =============================================

DROP POLICY IF EXISTS "Users can manage own images" ON images;
DROP POLICY IF EXISTS "Users can delete their own images" ON images;
DROP POLICY IF EXISTS "Users can insert their own images" ON images;
DROP POLICY IF EXISTS "Users can view their own images" ON images;
DROP POLICY IF EXISTS "Users can update their own images" ON images;

CREATE POLICY "Users can manage own images"
  ON images FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 3: tags — Drop ALL, create single FOR ALL
--
-- Current state has 4 overlapping policies:
--   "Users can manage own tags"        (FOR ALL)
--   "Users can insert their own tags"  (INSERT)
--   "Users can view their own tags"    (SELECT)
--   "Users can update their own tags"  (UPDATE)
-- =============================================

DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON tags;
DROP POLICY IF EXISTS "Users can view their own tags" ON tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON tags;

CREATE POLICY "Users can manage own tags"
  ON tags FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 4: user_settings — Drop ALL, create single FOR ALL
--
-- Current state has 5 overlapping policies:
--   "Users can manage own settings"          (FOR ALL, public)
--   "Users can delete their own settings"    (DELETE, authenticated)
--   "Users can insert their own settings"    (INSERT, authenticated)
--   "Users can view their own settings"      (SELECT, authenticated)
--   "Users can update their own settings"    (UPDATE, authenticated)
-- =============================================

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;

CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 5: image_tags — Drop BOTH duplicates, create single FOR ALL
--
-- Current state has 2 duplicate FOR ALL policies:
--   "Users can manage image_tags"      (FOR ALL, no WITH CHECK)
--   "Users can manage own image tags"  (FOR ALL, with WITH CHECK)
-- =============================================

DROP POLICY IF EXISTS "Users can manage image_tags" ON image_tags;
DROP POLICY IF EXISTS "Users can manage own image tags" ON image_tags;

CREATE POLICY "Users can manage own image tags"
  ON image_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM images
      WHERE images.uid = image_tags.image_uid
      AND images.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM images
      WHERE images.uid = image_tags.image_uid
      AND images.user_id = (select auth.uid())
    )
  );

-- =============================================
-- SECTION 6: category_tags — Drop BOTH duplicates, create single FOR ALL
--
-- Current state has 2 duplicate FOR ALL policies:
--   "Users can manage category_tags"       (FOR ALL, no WITH CHECK)
--   "Users can manage own category tags"   (FOR ALL, with WITH CHECK)
-- =============================================

DROP POLICY IF EXISTS "Users can manage category_tags" ON category_tags;
DROP POLICY IF EXISTS "Users can manage own category tags" ON category_tags;

CREATE POLICY "Users can manage own category tags"
  ON category_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.uid = category_tags.category_uid
      AND categories.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.uid = category_tags.category_uid
      AND categories.user_id = (select auth.uid())
    )
  );

-- =============================================
-- SECTION 7: user_storage — Drop ALL 6, create 4 per-operation
--
-- Current state has 6 overlapping policies:
--   "Users can manage own storage"        (FOR ALL)
--   "Users can insert their own storage"  (INSERT)
--   "Admins can read all user storage"    (SELECT)
--   "Users can view their own storage"    (SELECT)
--   "Admins can update all user storage"  (UPDATE)
--   "Users can update their own storage"  (UPDATE)
-- =============================================

DROP POLICY IF EXISTS "Users can manage own storage" ON user_storage;
DROP POLICY IF EXISTS "Users can insert their own storage" ON user_storage;
DROP POLICY IF EXISTS "Admins can read all user storage" ON user_storage;
DROP POLICY IF EXISTS "Users can view their own storage" ON user_storage;
DROP POLICY IF EXISTS "Admins can update all user storage" ON user_storage;
DROP POLICY IF EXISTS "Users can update their own storage" ON user_storage;

CREATE POLICY "Users or admins can read user storage"
  ON user_storage FOR SELECT
  USING ((select auth.uid()) = user_id OR is_admin());

CREATE POLICY "Users can insert own storage"
  ON user_storage FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users or admins can update user storage"
  ON user_storage FOR UPDATE
  USING ((select auth.uid()) = user_id OR is_admin())
  WITH CHECK ((select auth.uid()) = user_id OR is_admin());

CREATE POLICY "Users can delete own storage"
  ON user_storage FOR DELETE
  USING ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 8: shared_galleries — Drop ALL 2, create 4 per-operation
--
-- Current state:
--   "Owners can manage their shares"          (FOR ALL)
--   "Anyone can read active shares by token"  (SELECT)
-- =============================================

DROP POLICY IF EXISTS "Owners can manage their shares" ON shared_galleries;
DROP POLICY IF EXISTS "Anyone can read active shares by token" ON shared_galleries;

CREATE POLICY "Owners or public can read shares"
  ON shared_galleries FOR SELECT
  USING (owner_id = (select auth.uid()) OR is_active = true);

CREATE POLICY "Owners can create shares"
  ON shared_galleries FOR INSERT
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Owners can update shares"
  ON shared_galleries FOR UPDATE
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Owners can delete shares"
  ON shared_galleries FOR DELETE
  USING (owner_id = (select auth.uid()));

-- =============================================
-- SECTION 9: notification_preferences — Drop ALL 2, create 4 per-operation
--
-- Current state:
--   "Users can manage own notification preferences"  (FOR ALL)
--   "Anyone can read notification preferences"       (SELECT)
-- =============================================

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Anyone can read notification preferences" ON notification_preferences;

CREATE POLICY "Anyone can read notification preferences"
  ON notification_preferences FOR SELECT
  USING (true);

CREATE POLICY "Users can insert notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update notification preferences"
  ON notification_preferences FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete notification preferences"
  ON notification_preferences FOR DELETE
  USING ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 10: notifications — InitPlan fix on 3 policies
-- (INSERT "Notifications for gallery owners only" has no auth.uid() — unchanged)
-- =============================================

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = (select auth.uid()));

-- =============================================
-- SECTION 11: share_comments — Merge INSERT and DELETE pairs
-- (SELECT "Anyone can read comments" has no auth.uid() — unchanged)
-- =============================================

-- Merge 2 INSERT policies into 1
DROP POLICY IF EXISTS "Viewers can add comments" ON share_comments;
DROP POLICY IF EXISTS "Owners can add comments on their galleries" ON share_comments;

CREATE POLICY "Viewers and owners can add comments"
  ON share_comments FOR INSERT
  WITH CHECK (
    -- Viewer path: gallery allows comments and is active
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.allow_comments = true
      AND sg.is_active = true
    )
    OR
    -- Owner path: owner posting on their own gallery
    (
      owner_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM shared_galleries sg
        WHERE sg.id = shared_gallery_id
        AND sg.owner_id = (select auth.uid())
      )
    )
  );

-- Merge 2 DELETE policies into 1 (also converts IN→EXISTS)
DROP POLICY IF EXISTS "Owners can delete comments on their galleries" ON share_comments;
DROP POLICY IF EXISTS "Viewers can delete own comments" ON share_comments;

CREATE POLICY "Owners and viewers can delete comments"
  ON share_comments FOR DELETE
  USING (
    -- Owner path: can delete any comment on their gallery
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.owner_id = (select auth.uid())
    )
    OR
    -- Viewer path: can delete own comments (matched by session)
    EXISTS (
      SELECT 1 FROM share_viewers sv
      WHERE sv.id = viewer_id
      AND sv.session_id = (select current_setting('request.jwt.claims', true)::json->>'sub')
    )
  );

-- =============================================
-- SECTION 12: share_uploads — InitPlan fix on UPDATE and DELETE
-- (INSERT and SELECT have no auth.uid() — unchanged)
-- =============================================

DROP POLICY IF EXISTS "Owners can update uploads" ON share_uploads;
CREATE POLICY "Owners can update uploads"
  ON share_uploads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = share_uploads.shared_gallery_id
      AND sg.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can delete uploads" ON share_uploads;
CREATE POLICY "Owners can delete uploads"
  ON share_uploads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = share_uploads.shared_gallery_id
      AND sg.owner_id = (select auth.uid())
    )
  );

-- =============================================
-- SECTION 13: share_access_log — InitPlan fix on SELECT
-- (INSERT has no auth.uid() — unchanged)
-- =============================================

DROP POLICY IF EXISTS "Owners can read access logs" ON share_access_log;
CREATE POLICY "Owners can read access logs"
  ON share_access_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.owner_id = (select auth.uid())
    )
  );

COMMIT;
