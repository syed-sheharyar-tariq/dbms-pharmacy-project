import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { authApi } from '../api/client';

export { supabase };

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentSession, fallbackData = null) => {
    if (!currentSession) {
      setProfile(null);
      return null;
    }

    try {
      // 1. Try to fetch existing profile
      const res = await authApi.getMe();
      if (res?.data) {
        setProfile(res.data);
        return res.data;
      }
    } catch (err) {
      // 2. If profile not found in backend public.users, sync it
      try {
        const userEmail = currentSession.user.email;
        const initialName =
          fallbackData?.name ||
          currentSession.user.user_metadata?.full_name ||
          userEmail.split('@')[0];
        const requestedRole =
          fallbackData?.requested_role ||
          currentSession.user.user_metadata?.requested_role ||
          null;
        const contact =
          fallbackData?.contact ||
          currentSession.user.user_metadata?.contact ||
          null;

        const syncRes = await authApi.syncProfile({
          name: initialName,
          contact: contact,
          requested_role: requestedRole,
        });

        if (syncRes?.data) {
          setProfile(syncRes.data);
          return syncRes.data;
        }
      } catch (syncErr) {
        console.error('Failed to sync profile with pharmacy backend:', syncErr);
        setProfile(null);
        throw syncErr;
      }
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    // Initial session load
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession) {
        try {
          await loadProfile(initialSession);
        } catch (e) {
          console.warn('Initial profile load notice:', e.message);
        }
      }
      if (isMounted) setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession) {
        try {
          await loadProfile(newSession);
        } catch (e) {
          console.warn('Auth state change profile load notice:', e.message);
        }
      } else {
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      setSession(data.session);
      setUser(data.user);

      // Await profile loading before returning so ProtectedRoute doesn't bounce
      const loadedProfile = await loadProfile(data.session);
      if (!loadedProfile) {
        throw new Error(
          'Authenticated with Supabase, but failed to load pharmacy staff profile. Please verify your backend server is running.'
        );
      }
      return { ...data, profile: loadedProfile };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, fullName, requestedRole = 'Cashier', contact = '') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            requested_role: requestedRole,
            contact: contact,
          },
        },
      });
      if (error) throw error;

      if (!data.session) {
        // Supabase has email confirmation enabled
        return {
          user: data.user,
          session: null,
          confirmationRequired: true,
        };
      }

      setSession(data.session);
      setUser(data.user);

      // Sync and load profile with chosen role
      const loadedProfile = await loadProfile(data.session, {
        name: fullName,
        requested_role: requestedRole,
        contact: contact,
      });

      return {
        user: data.user,
        session: data.session,
        profile: loadedProfile,
        confirmationRequired: false,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session) {
      await loadProfile(session);
    }
  };

  const value = {
    session,
    user,
    profile,
    role: profile?.role || null,
    loading,
    login,
    signup,
    logout,
    refreshProfile,
    isAuthenticated: Boolean(session && profile && profile.is_active),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
