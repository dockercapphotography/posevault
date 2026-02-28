-- =============================================
-- PoseVault — Rollback for Migration 016
-- Restores all policies to their pre-016 state (after 014+015)
-- Run in Supabase SQL Editor if 016 causes issues.
-- =============================================

BEGIN;

-- =============================================
-- SECTION 1: Core tables — Restore original FOR ALL policies
-- =============================================

DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own images" ON images;
CREATE POLICY "Users can manage own images"
  ON images FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags"
  ON tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- SECTION 2: Junction tables — Restore original FOR ALL policies
-- =============================================

DROP POLICY IF EXISTS "Users can manage own image tags" ON image_tags;
CREATE POLICY "Users can manage own image tags"
  ON image_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM images WHERE images.uid = image_tags.image_uid AND images.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM images WHERE images.uid = image_tags.image_uid AND images.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage own category tags" ON category_tags;
CREATE POLICY "Users can manage own category tags"
  ON category_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM categories WHERE categories.uid = category_tags.category_uid AND categories.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM categories WHERE categories.uid = category_tags.category_uid AND categories.user_id = auth.uid())
  );

-- =============================================
-- SECTION 3: Notifications — Restore original per-operation policies
-- =============================================

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- SECTION 4: Share tables — Restore post-014/015 policies
-- =============================================

DROP POLICY IF EXISTS "Owners can update uploads" ON share_uploads;
CREATE POLICY "Owners can update uploads"
  ON share_uploads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = share_uploads.shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can delete uploads" ON share_uploads;
CREATE POLICY "Owners can delete uploads"
  ON share_uploads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = share_uploads.shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can read access logs" ON share_access_log;
CREATE POLICY "Owners can read access logs"
  ON share_access_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );

-- =============================================
-- SECTION 5: user_storage — Restore original 3-policy setup
-- =============================================

DROP POLICY IF EXISTS "Users or admins can read user storage" ON user_storage;
DROP POLICY IF EXISTS "Users can insert own storage" ON user_storage;
DROP POLICY IF EXISTS "Users or admins can update user storage" ON user_storage;
DROP POLICY IF EXISTS "Users can delete own storage" ON user_storage;

CREATE POLICY "Users can manage own storage"
  ON user_storage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all user storage"
  ON user_storage FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can update all user storage"
  ON user_storage FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

-- =============================================
-- SECTION 6: shared_galleries — Restore original 2-policy setup
-- =============================================

DROP POLICY IF EXISTS "Owners or public can read shares" ON shared_galleries;
DROP POLICY IF EXISTS "Owners can create shares" ON shared_galleries;
DROP POLICY IF EXISTS "Owners can update shares" ON shared_galleries;
DROP POLICY IF EXISTS "Owners can delete shares" ON shared_galleries;

CREATE POLICY "Owners can manage their shares"
  ON shared_galleries FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Anyone can read active shares by token"
  ON shared_galleries FOR SELECT
  USING (is_active = true);

-- =============================================
-- SECTION 7: notification_preferences — Restore original 2-policy setup
-- =============================================

DROP POLICY IF EXISTS "Anyone can read notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete notification preferences" ON notification_preferences;

CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read notification preferences"
  ON notification_preferences FOR SELECT
  USING (true);

-- =============================================
-- SECTION 8: share_comments — Restore original separate policies
-- =============================================

-- Restore separate INSERT policies
DROP POLICY IF EXISTS "Viewers and owners can add comments" ON share_comments;

CREATE POLICY "Viewers can add comments"
  ON share_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.allow_comments = true
      AND sg.is_active = true
    )
  );

CREATE POLICY "Owners can add comments on their galleries"
  ON share_comments FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );

-- Restore separate DELETE policies
DROP POLICY IF EXISTS "Owners and viewers can delete comments" ON share_comments;

CREATE POLICY "Owners can delete comments on their galleries"
  ON share_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );

CREATE POLICY "Viewers can delete own comments"
  ON share_comments FOR DELETE
  USING (
    viewer_id IN (
      SELECT id FROM share_viewers
      WHERE session_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

COMMIT;
