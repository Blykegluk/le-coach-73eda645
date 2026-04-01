import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/profile';
import { isProfileComplete } from '@/types/profile';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setIsComplete(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        setIsComplete(false);
      } else {
        // Cast to Profile type (Supabase types may not have new columns yet)
        const profileData = data as unknown as Profile;
        setProfile(profileData);
        setIsComplete(isProfileComplete(profileData));
      }
      
      setIsLoading(false);
    };

    fetchProfile();
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

  return {
    profile,
    isLoading,
    isComplete,
    updateProfile,
    refetch: async () => {
      setIsLoading(true);
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
      }
      setIsLoading(false);
    }
  };
}
