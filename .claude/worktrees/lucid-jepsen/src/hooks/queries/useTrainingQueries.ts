import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  activity_type: string;
  duration_min: number;
  calories_burned: number | null;
  distance_km: number | null;
  notes: string | null;
  performed_at: string;
}

export const trainingKeys = {
  all: ['training'] as const,
  activities: (userId: string) => [...trainingKeys.all, 'activities', userId] as const,
  userWeight: (userId: string) => [...trainingKeys.all, 'userWeight', userId] as const,
};

export function useActivities(userId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.activities(userId ?? ''),
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId!)
        .order('performed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as Activity[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useUserWeight(userId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.userWeight(userId ?? ''),
    queryFn: async (): Promise<number> => {
      const { data } = await supabase
        .from('profiles')
        .select('weight_kg')
        .eq('user_id', userId!)
        .maybeSingle();

      return data?.weight_kg ?? 70;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

export function useTrainingRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('training_activities_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: trainingKeys.activities(userId) });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
