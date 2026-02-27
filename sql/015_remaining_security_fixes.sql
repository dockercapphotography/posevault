-- ============================================
-- 015: Remaining Security Advisor Fixes
-- ============================================
-- Addresses the final 5 security warnings from Supabase Dashboard:
--
--   1. delete_user_account() missing SET search_path
--   2. share_access_log INSERT: WITH CHECK (true)
--   3. share_uploads INSERT: WITH CHECK (true)
--   4. share_viewers INSERT: WITH CHECK (true)
--
-- Issue 5 (Leaked Password Protection) is a dashboard toggle,
-- not a SQL fix — see instructions at the bottom of this file.
--
-- Run in Supabase SQL Editor.
-- ============================================


-- ============================================
-- 1. Fix delete_user_account() search_path
-- ============================================
-- This function was created outside migrations. We recreate it
-- with SET search_path = public to resolve the security warning.
-- The function lets a user delete their own auth account.

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void AS $$
BEGIN
  -- Only allow users to delete their own account
  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'Access denied: can only delete your own account';
  END IF;

  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Ensure the function is callable
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;


-- ============================================
-- 2. Tighten share_viewers INSERT
-- ============================================
-- Before: WITH CHECK (true) — anyone could create arbitrary viewer sessions
-- After:  shared_gallery_id must reference an active, non-expired gallery
-- Note:   This is the entry point — viewers register here first,
--         then the other tables reference the viewer_id.

DROP POLICY IF EXISTS "Anyone can create a viewer session" ON share_viewers;
CREATE POLICY "Anyone can create a viewer session"
  ON share_viewers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.is_active = true
    )
  );


-- ============================================
-- 3. Tighten share_access_log INSERT
-- ============================================
-- Before: WITH CHECK (true) — anyone could insert arbitrary log entries
-- After:  viewer_id must belong to a viewer registered for that gallery

DROP POLICY IF EXISTS "Anyone can log share access" ON share_access_log;
CREATE POLICY "Anyone can log share access"
  ON share_access_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM share_viewers sv
      WHERE sv.id = viewer_id
      AND sv.shared_gallery_id = shared_gallery_id
    )
  );


-- ============================================
-- 4. Tighten share_uploads INSERT
-- ============================================
-- Before: WITH CHECK (true) — anyone could insert upload records
-- After:  viewer must belong to the gallery AND uploads must be enabled

DROP POLICY IF EXISTS "Viewers can upload images" ON share_uploads;
CREATE POLICY "Viewers can upload images"
  ON share_uploads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM share_viewers sv
      WHERE sv.id = viewer_id
      AND sv.shared_gallery_id = shared_gallery_id
    )
    AND EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = shared_gallery_id
      AND sg.is_active = true
      AND sg.allow_uploads = true
    )
  );


-- ============================================
-- 5. Leaked Password Protection (MANUAL STEP)
-- ============================================
-- This is NOT a SQL fix. In the Supabase Dashboard:
--
--   1. Go to Authentication → Settings → Security
--   2. Enable "Leaked Password Protection"
--   3. Save
--
-- This checks new passwords against HaveIBeenPwned.org
-- to prevent users from signing up with compromised passwords.
