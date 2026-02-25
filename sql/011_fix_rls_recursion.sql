-- ============================================
-- Fix: Infinite recursion in user_storage RLS policies
-- ============================================
-- The admin policies were doing SELECT FROM user_storage inside
-- an RLS policy ON user_storage, causing infinite recursion.
-- Fix: use a SECURITY DEFINER function that bypasses RLS.
-- ============================================

-- Step 1: Create a SECURITY DEFINER function to check admin status.
-- SECURITY DEFINER runs as the function owner (superuser), bypassing RLS,
-- so it can read user_storage.is_admin without triggering the policy loop.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_storage WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop the broken self-referencing policies
DROP POLICY IF EXISTS "Admins can read all user storage" ON user_storage;
DROP POLICY IF EXISTS "Admins can update all user storage" ON user_storage;

-- Step 3: Recreate policies using the is_admin() function (no recursion)
CREATE POLICY "Admins can read all user storage"
  ON user_storage FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can update all user storage"
  ON user_storage FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());
