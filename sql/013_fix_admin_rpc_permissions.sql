-- ============================================
-- Fix: Grant execute on admin RPC functions
-- ============================================
-- Newer Supabase projects revoke the default PUBLIC execute privilege
-- on functions. Without explicit GRANT, the authenticated role cannot
-- call these functions through PostgREST, resulting in a 400 error.
-- ============================================

-- Allow authenticated users to call get_admin_user_list()
-- (the function itself checks is_admin() internally)
GRANT EXECUTE ON FUNCTION get_admin_user_list() TO authenticated;

-- Also ensure is_admin() is callable (used in RLS policies)
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
