import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await storage.get('current-session');
      if (result && result.value) {
        const session = JSON.parse(result.value);
        setCurrentUser(session.email);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log('No active session');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, userData) => {
    await storage.set('current-session', JSON.stringify({ 
      email, 
      firstName: userData.firstName, 
      lastName: userData.lastName 
    }));
    setCurrentUser(email);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await storage.delete('current-session');
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    isAuthenticated,
    currentUser,
    isLoading,
    login,
    logout,
    checkAuth
  };
};
