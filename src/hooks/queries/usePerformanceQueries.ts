import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceStats {
  totalSessions: number;
  totalTimeMin: number;
  totalCalories: number;
  currentStreak: number;
}

export const performanceKeys = {
  all: ['performance'] as const,
  stats: (userId: string) => [...performanceKeys.all, 'stats', userId] as const,
};

export function usePerformanceStats(userId: string | undefined) {
  return useQuery({
    queryKey: performanceKeys.stats(userId ?? ''),
    queryFn: async (): Promise<PerformanceStats> => {
      const { data: activities, error } = await supabase
        .from('activities')
        .select('duration_min, calories_burned, performed_at')
        .eq('user_id', userId!)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      if (!activities || activities.length === 0) {
        return { totalSessions: 0, totalTimeMin: 0, totalCalories: 0, currentStreak: 0 };
      }

      const totalSessions = activities.length;
      const totalTimeMin = activities.reduce((sum, a) => sum + (a.duration_min || 0), 0);
      const totalCalories = activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0);

      // Calculate streak (consecutive days with activities)
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activityDates = [...new Set(
        activities.map(a => new Date(a.performed_at).toISOString().split('T')[0])
      )].sort().reverse();

      for (let i = 0; i < activityDates.length; i++) {
        const activityDate = new Date(activityDates[i]);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);

        if (activityDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
          streak++;
        } else {
          break;
        }
      }

      return { totalSessions, totalTimeMin, totalCalories, currentStreak: streak };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
