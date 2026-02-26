-- ============================================
-- Fix: Recreate get_admin_user_list with correct types + grant execute
-- ============================================
-- The existing function throws "structure of query does not match function
-- result type" due to column type mismatches between the RETURNS TABLE
-- declaration and the actual table columns. DROP + CREATE with explicit
-- casts resolves this. Also grants execute to the authenticated role
-- (required on newer Supabase projects).
-- ============================================

-- Drop the broken function so we can recreate with correct return types
DROP FUNCTION IF EXISTS get_admin_user_list();

-- Recreate with explicit casts to guarantee type alignment
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

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION get_admin_user_list() TO authenticated;

-- Also ensure is_admin() is callable (used in RLS policies)
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
