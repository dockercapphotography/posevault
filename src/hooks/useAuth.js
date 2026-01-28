import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        setCurrentUser(data.session.user.email);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link in their email — prompt for new password
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
      } else if (session) {
        setCurrentUser(session.user.email);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Provide more specific error messages
      if (error.message === 'Invalid login credentials') {
        throw new Error(
          'Invalid email or password. If you just registered, please check your email and confirm your account first.'
        );
      }
      throw error;
    }

    return data;
  };

  const register = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // firstName, lastName stored in user metadata
      },
    });

    if (error) {
      throw error;
    }

    // Check if email confirmation is required
    // If session is null, the user needs to confirm their email
    const needsEmailConfirmation = !data.session;

    return { ...data, needsEmailConfirmation };
  };

  const logout = async () => {
    // Use global scope to invalidate all sessions server-side
    // This prevents stale refresh tokens from causing issues
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      console.error('Logout error (global):', error);
      // Fallback: at minimum, clear local session
      await supabase.auth.signOut({ scope: 'local' });
    }
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      throw error;
    }
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    setIsPasswordRecovery(false);
  };

  return {
    isAuthenticated,
    currentUser,
    session, // Expose session for R2 uploads (access_token)
    isLoading,
    isPasswordRecovery,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
  };
};
