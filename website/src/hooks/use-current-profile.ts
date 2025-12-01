'use client';

import { useEffect, useState } from 'react';

import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  role: 'USER' | 'ADMIN' | 'RESTAURANT';
  restaurantId?: string | null;
};

export const useCurrentProfile = () => {
  const { user, isLoading: authLoading } = useSupabaseAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (authLoading) {
      return () => {
        isMounted = false;
      };
    }

    if (!user?.email) {
      setProfile(null);
      setIsLoading(false);
      setError(null);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setError(null);

    const controller = new AbortController();

    fetch(`/api/users?email=${encodeURIComponent(user.email)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? 'Unable to load profile.');
        }
        return response.json();
      })
      .then((data: { user: UserProfile }) => {
        if (isMounted) {
          setProfile(data.user);
          setIsLoading(false);
        }
      })
      .catch((fetchError) => {
        if (!isMounted || controller.signal.aborted) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load profile.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [authLoading, user?.email]);

  return { profile, isLoading, error };
};



