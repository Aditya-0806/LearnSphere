import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isConfigured, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isConfigured);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data || null);
    return data || null;
  }, []);

  useEffect(() => {
    if (!isConfigured) return undefined;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        await loadProfile(data.session?.user?.id);
      })
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      // Defer so we never run Supabase calls inside the auth callback itself.
      setTimeout(() => loadProfile(nextSession?.user?.id), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const signUp = useCallback(async ({ fullName, username, email, password }) => {
    const { data: available, error: checkError } = await supabase.rpc('username_available', { p_username: username });
    if (checkError) throw checkError;
    if (!available) throw Object.assign(new Error('That username is taken. Try another one.'), { field: 'username' });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw error;
    // Supabase hides "email already exists" by returning a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw Object.assign(new Error('An account with this email already exists. Try logging in.'), { field: 'email' });
    }
    return { needsVerification: !data.session };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile: () => loadProfile(session?.user?.id),
    }),
    [session, profile, loading, signUp, signIn, signOut, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
