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
    }).catch(() => {
      setSession(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
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
    // Use local scope — clears this browser's session without a server call.
    // The server-side session/refresh token will expire naturally.
    // This avoids 403 errors when the session was already invalidated
    // (e.g. logged out from another tab or device).
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Logout error:', error);
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
