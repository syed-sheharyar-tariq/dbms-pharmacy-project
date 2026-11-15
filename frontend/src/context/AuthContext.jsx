import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { setTokenGetter, authApi } from '../api/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hook token getter to Axios client
  useEffect(() => {
    setTokenGetter(async () => {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    });
  }, []);

  const loadProfile = async (currentSession) => {
    if (!currentSession) {
      setProfile(null);
      return;
    }
    try {
      const res = await authApi.getMe();
      setProfile(res.data);
    } catch (err) {
      // If profile does not exist yet, attempt sync with display name or email prefix
      try {
        const userEmail = currentSession.user.email;
        const initialName = currentSession.user.user_metadata?.full_name || userEmail.split('@')[0];
        const syncRes = await authApi.syncProfile({ name: initialName });
        setProfile(syncRes.data);
      } catch (syncErr) {
        console.error('Failed to sync profile with pharmacy backend:', syncErr);
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession) {
        loadProfile(initialSession).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession) {
        await loadProfile(newSession);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signup = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) throw error;
    return data;
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
    isAuthenticated: !!session && !!profile && profile.is_active,
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
