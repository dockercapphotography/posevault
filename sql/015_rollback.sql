-- ============================================
-- 015_rollback: Undo all changes from 015_remaining_security_fixes.sql
-- ============================================

-- 1. Restore delete_user_account without SET search_path
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void AS $$
BEGIN
  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'Access denied: can only delete your own account';
  END IF;

  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Restore share_viewers INSERT (wide open)
DROP POLICY IF EXISTS "Anyone can create a viewer session" ON share_viewers;
CREATE POLICY "Anyone can create a viewer session"
  ON share_viewers
  FOR INSERT
  WITH CHECK (true);

-- 3. Restore share_access_log INSERT (wide open)
DROP POLICY IF EXISTS "Anyone can log share access" ON share_access_log;
CREATE POLICY "Anyone can log share access"
  ON share_access_log
  FOR INSERT
  WITH CHECK (true);

-- 4. Restore share_uploads INSERT (wide open)
DROP POLICY IF EXISTS "Viewers can upload images" ON share_uploads;
CREATE POLICY "Viewers can upload images"
  ON share_uploads
  FOR INSERT
  WITH CHECK (true);
