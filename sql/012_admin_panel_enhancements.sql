-- ============================================
-- Admin Panel Enhancements
-- ============================================
-- 1. Function to fetch user list with display names/emails (from auth.users)
-- 2. RLS policies on storage_tiers so admins can manage tiers
-- ============================================

-- 1. SECURITY DEFINER function to join user_storage with auth.users
--    (auth.users is not accessible from the client without service role)
DROP FUNCTION IF EXISTS get_admin_user_list();

CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
  uid BIGINT,
  user_id UUID,
  current_storage BIGINT,
  maximum_storage BIGINT,
  storage_tier INT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  display_name TEXT,
  email TEXT
) AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    us.uid::BIGINT,
    us.user_id::UUID,
    us.current_storage::BIGINT,
    us.maximum_storage::BIGINT,
    us.storage_tier::INT,
    us.is_admin::BOOLEAN,
    us.created_at::TIMESTAMPTZ,
    COALESCE(
      TRIM(
        COALESCE(au.raw_user_meta_data->>'firstName', '') || ' ' ||
        COALESCE(au.raw_user_meta_data->>'lastName', '')
      ),
      ''
    )::TEXT AS display_name,
    COALESCE(au.email, '')::TEXT AS email
  FROM user_storage us
  LEFT JOIN auth.users au ON au.id = us.user_id
  ORDER BY us.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute to authenticated role (required for Supabase projects where
-- default public execute privilege has been revoked)
GRANT EXECUTE ON FUNCTION get_admin_user_list() TO authenticated;

-- 2. Allow admins to manage storage tiers (insert, update, delete)
CREATE POLICY "Admins can insert storage tiers"
  ON storage_tiers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update storage tiers"
  ON storage_tiers FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete storage tiers"
  ON storage_tiers FOR DELETE
  USING (is_admin());
