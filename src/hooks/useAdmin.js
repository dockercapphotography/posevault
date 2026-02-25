import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook to check if the current user is an admin.
 * Reads the is_admin flag from user_storage.
 */
export function useAdmin(userId) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from('user_storage')
          .select('is_admin')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Admin check error:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.is_admin === true);
        }
      } catch (err) {
        console.error('Admin check exception:', err);
        setIsAdmin(false);
      }
      setIsLoading(false);
    };

    checkAdmin();
  }, [userId]);

  return { isAdmin, isLoading };
}
