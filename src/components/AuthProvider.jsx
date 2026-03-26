import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthSession,
  fetchCurrentUser,
  getStoredAuthToken,
  getStoredAuthUser,
  signIn,
  signOut,
  signUp,
  syncTripToAccount,
} from '../lib/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuthUser());
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const token = getStoredAuthToken();

      if (!token) {
        if (isMounted) {
          setIsAuthReady(true);
        }
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        if (!isMounted) return;
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load current user', error);
        clearAuthSession();
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthReady,
      signIn: async (credentials) => {
        const nextUser = await signIn(credentials);
        setUser(nextUser);
        return nextUser;
      },
      signUp: async (credentials) => {
        const nextUser = await signUp(credentials);
        setUser(nextUser);
        return nextUser;
      },
      signOut: async () => {
        await signOut();
        setUser(null);
      },
      refreshUser: async () => {
        const nextUser = await fetchCurrentUser();
        setUser(nextUser);
        return nextUser;
      },
      syncTripToAccount: async (tripPlan, types) => {
        const nextUser = await syncTripToAccount(tripPlan, types);
        setUser(nextUser);
        return nextUser;
      },
    }),
    [isAuthReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
};
