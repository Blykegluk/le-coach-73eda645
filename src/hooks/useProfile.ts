import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/profile';
import { isProfileComplete } from '@/types/profile';

const PROFILE_COMPLETE_KEY = 'profile_complete';

export function useProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  // Initialise isComplete from sessionStorage to prevent flash redirects
  // when the component remounts during token refreshes.
  const [isComplete, setIsComplete] = useState(() => {
    try { return sessionStorage.getItem(PROFILE_COMPLETE_KEY) === '1'; } catch { return false; }
  });
  // Track which user ID the current profile belongs to
  const fetchedForRef = useRef<string | null>(null);

  // Sync isComplete → sessionStorage
  useEffect(() => {
    try {
      if (isComplete) {
        sessionStorage.setItem(PROFILE_COMPLETE_KEY, '1');
      } else if (!user) {
        sessionStorage.removeItem(PROFILE_COMPLETE_KEY);
      }
    } catch { /* SSR / private browsing */ }
  }, [isComplete, user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsComplete(false);
      setIsFetching(false);
      fetchedForRef.current = null;
      return;
    }

    // If user changed, mark as not fetched yet
    if (fetchedForRef.current !== user.id) {
      fetchedForRef.current = null;
    }

    let cancelled = false;
    setIsFetching(true);

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (cancelled) return;

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        setIsComplete(false);
      } else {
        const profileData = data as unknown as Profile;
        setProfile(profileData);
        setIsComplete(isProfileComplete(profileData));
      }

      fetchedForRef.current = user.id;
      setIsFetching(false);
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates as Record<string, unknown>)
      .eq('user_id', user.id)
      .select()
      .single();

    if (!error && data) {
      const updatedProfile = data as unknown as Profile;
      setProfile(updatedProfile);
      setIsComplete(isProfileComplete(updatedProfile));
    }

    return { data, error };
  };

  // isLoading is true while:
  // - auth is still loading (don't know user yet)
  // - profile fetch is in progress
  // - user exists but profile hasn't been fetched for this user yet
  const isLoading = authLoading || isFetching || (!!user && fetchedForRef.current !== user.id);

  return {
    profile,
    isLoading,
    isComplete,
    updateProfile,
    refetch: async () => {
      setIsFetching(true);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (data) {
          const profileData = data as unknown as Profile;
          setProfile(profileData);
          setIsComplete(isProfileComplete(profileData));
        }
        fetchedForRef.current = user.id;
      }
      setIsFetching(false);
    }
  };
}
