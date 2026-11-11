import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getAuthModeInfo,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  onAuthStateChange,
  resetPassword as resetPasswordRequest,
  signup as signupRequest,
  updateSellerProfile as updateSellerProfileRequest,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const authMode = useMemo(() => getAuthModeInfo(), []);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((initialUser) => {
        if (active) setUser(initialUser);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = onAuthStateChange((nextUser) => {
      if (active) {
        setUser(nextUser);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await loginRequest(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(async (payload) => {
    const result = await signupRequest(payload);
    if (result.user && !result.requiresEmailConfirmation) {
      setUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (payload) => {
    return resetPasswordRequest(payload);
  }, []);

  const updateSellerProfile = useCallback(async (profilePayload) => {
    const updatedUser = await updateSellerProfileRequest(profilePayload);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const accountType = user?.accountType || null;
  const isBuyer = accountType === 'buyer';
  const isSeller = accountType === 'seller';

  const value = {
    user,
    accountType,
    isBuyer,
    isSeller,
    sellerProfile: user?.sellerProfile || null,
    isAuthenticated: Boolean(user),
    loading,
    authMode,
    login,
    signup,
    logout,
    resetPassword,
    updateSellerProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
