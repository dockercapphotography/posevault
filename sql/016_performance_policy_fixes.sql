-- =============================================
-- PoseVault — Migration 016: Performance Policy Fixes
-- Run in Supabase SQL Editor
-- =============================================
--
-- Addresses Supabase Performance Advisor warnings:
--
--   auth_rls_initplan (32 warnings):
--     Wrap auth.uid() and current_setting() in (select ...) so
--     PostgreSQL evaluates them once per query (InitPlan) instead of per row.
--
--   multiple_permissive_policies (24 warnings):
--     Merge overlapping permissive policies on the same table+operation
--     into a single policy with OR logic, so PostgreSQL only evaluates one
--     policy per row instead of multiple.
--
-- =============================================

BEGIN;

-- =============================================
-- SECTION 1: Core tables — InitPlan fix
-- Rewrite FOR ALL policies with (select auth.uid())
-- =============================================

-- categories
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- images
DROP POLICY IF EXISTS "Users can manage own images" ON images;
CREATE POLICY "Users can manage own images"
  ON images FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- tags
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags"
  ON tags FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- user_settings
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 2: Junction tables — InitPlan fix
-- Rewrite FOR ALL policies with (select auth.uid()) inside EXISTS
-- =============================================

-- image_tags
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

-- category_tags
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
-- SECTION 3: Notifications — InitPlan fix
-- Per-operation policies, wrap auth.uid()
-- (INSERT policy "Notifications for gallery owners only" does not
--  use auth.uid() directly, so it needs no change.)
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
-- SECTION 4: Share tables — InitPlan fix
-- =============================================

-- share_uploads: owner update/delete policies
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

-- share_access_log: owner read policy
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

-- =============================================
-- SECTION 5: user_storage — Decompose FOR ALL + Merge
--
-- Before: 3 policies creating overlap on SELECT and UPDATE:
--   "Users can manage own storage"    FOR ALL  USING (auth.uid() = user_id)
--   "Admins can read all user storage" FOR SELECT USING (auth.uid() = user_id OR is_admin())
--   "Admins can update all user storage" FOR UPDATE USING (auth.uid() = user_id OR is_admin())
--
-- After: 4 per-operation policies with merged conditions:
-- =============================================

DROP POLICY IF EXISTS "Users can manage own storage" ON user_storage;
DROP POLICY IF EXISTS "Admins can read all user storage" ON user_storage;
DROP POLICY IF EXISTS "Admins can update all user storage" ON user_storage;

-- SELECT: merged (user's own OR admin)
CREATE POLICY "Users or admins can read user storage"
  ON user_storage FOR SELECT
  USING ((select auth.uid()) = user_id OR is_admin());

-- INSERT: user's own only
CREATE POLICY "Users can insert own storage"
  ON user_storage FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE: merged (user's own OR admin)
CREATE POLICY "Users or admins can update user storage"
  ON user_storage FOR UPDATE
  USING ((select auth.uid()) = user_id OR is_admin())
  WITH CHECK ((select auth.uid()) = user_id OR is_admin());

-- DELETE: user's own only
CREATE POLICY "Users can delete own storage"
  ON user_storage FOR DELETE
  USING ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 6: shared_galleries — Decompose FOR ALL + Merge
--
-- Before: 2 policies creating overlap on SELECT:
--   "Owners can manage their shares"       FOR ALL  USING (owner_id = auth.uid())
--   "Anyone can read active shares by token" FOR SELECT USING (is_active = true)
--
-- After: 4 per-operation policies with merged SELECT:
-- =============================================

DROP POLICY IF EXISTS "Owners can manage their shares" ON shared_galleries;
DROP POLICY IF EXISTS "Anyone can read active shares by token" ON shared_galleries;

-- SELECT: merged (owner OR active gallery)
CREATE POLICY "Owners or public can read shares"
  ON shared_galleries FOR SELECT
  USING (owner_id = (select auth.uid()) OR is_active = true);

-- INSERT: owner only
CREATE POLICY "Owners can create shares"
  ON shared_galleries FOR INSERT
  WITH CHECK (owner_id = (select auth.uid()));

-- UPDATE: owner only
CREATE POLICY "Owners can update shares"
  ON shared_galleries FOR UPDATE
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- DELETE: owner only
CREATE POLICY "Owners can delete shares"
  ON shared_galleries FOR DELETE
  USING (owner_id = (select auth.uid()));

-- =============================================
-- SECTION 7: notification_preferences — Decompose FOR ALL + Merge
--
-- Before: 2 policies creating overlap on SELECT:
--   "Users can manage own notification preferences" FOR ALL USING (user_id = auth.uid())
--   "Anyone can read notification preferences"      FOR SELECT USING (true)
--
-- After: 4 per-operation policies with simplified SELECT:
-- =============================================

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Anyone can read notification preferences" ON notification_preferences;

-- SELECT: anyone can read (needed for anon viewers checking owner prefs)
CREATE POLICY "Anyone can read notification preferences"
  ON notification_preferences FOR SELECT
  USING (true);

-- INSERT: user's own only
CREATE POLICY "Users can insert notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE: user's own only
CREATE POLICY "Users can update notification preferences"
  ON notification_preferences FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- DELETE: user's own only
CREATE POLICY "Users can delete notification preferences"
  ON notification_preferences FOR DELETE
  USING ((select auth.uid()) = user_id);

-- =============================================
-- SECTION 8: share_comments — Merge overlapping INSERT & DELETE
--
-- INSERT before: 2 permissive policies
--   "Viewers can add comments"                    WITH CHECK (EXISTS gallery active+allows comments)
--   "Owners can add comments on their galleries"  WITH CHECK (owner_id = auth.uid() AND EXISTS owner check)
--
-- DELETE before: 2 permissive policies
--   "Owners can delete comments on their galleries" USING (EXISTS owner check)
--   "Viewers can delete own comments"               USING (viewer_id IN (SELECT ...current_setting...))
--
-- After: 1 merged INSERT + 1 merged DELETE, both with InitPlan fix
-- =============================================

-- Merge INSERT policies
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

-- Merge DELETE policies (also converts remaining IN→EXISTS)
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

COMMIT;
