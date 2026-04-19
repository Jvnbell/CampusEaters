import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { api, ApiError } from './api';
import { attachSupabaseAppStateListener, supabase } from './supabase';
import type { UserProfile } from './types';

type AuthContextValue = {
  session: Session | null;
  profile: UserProfile | null;
  initializing: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Hosts the Supabase session, the corresponding /api/users profile row, and
 * the auth actions consumed by the auth screens. Always wrap the app in this
 * provider — every screen relies on `useAuth()`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user?.email) {
      setProfile(null);
      return;
    }
    try {
      const data = await api<{ user: UserProfile }>(
        `/api/users?email=${encodeURIComponent(currentSession.user.email)}`,
      );
      setProfile(data.user);
    } catch (error) {
      // 404 means the row hasn't been auto-provisioned yet — usually a
      // millisecond after first signup. Leave profile as null and let the
      // screens re-trigger refreshProfile() when they mount.
      if (error instanceof ApiError && error.status === 404) {
        setProfile(null);
        return;
      }
      console.warn('[auth] Failed to load profile', error);
    }
  }, []);

  useEffect(() => {
    attachSupabaseAppStateListener();

    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (cancelled) return;
      setInitializing(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      initializing,
      refreshProfile: () => loadProfile(session),
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      signUp: async ({ email, password, firstName, lastName, phoneNumber }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber ?? null,
              role: 'USER',
            },
          },
        });
        if (error) throw new Error(error.message);

        // When email confirmations are required, Supabase returns a session
        // value of null. The /api/users row will be auto-provisioned on the
        // first authenticated request after the user confirms.
        return { needsConfirmation: !data.session };
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
        setProfile(null);
      },
      sendPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          // Deep link back into the app so users land on a "set new password"
          // screen on their device.
          redirectTo: 'campuseats://reset-password',
        });
        if (error) throw new Error(error.message);
      },
    }),
    [session, profile, initializing, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
}
